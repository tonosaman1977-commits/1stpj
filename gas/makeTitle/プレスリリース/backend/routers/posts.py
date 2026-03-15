import logging
import os
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import auth as auth_utils
import crypto
import models
import schemas
from database import get_db
from limiter import limiter
from services import gemini as gemini_service
from services import threads as threads_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/api/posts', tags=['posts'])

_DAILY_LIMIT = 50  # 1ユーザー1日あたりの最大承認件数


def _get_queue_item(post_id: str, user_id: str, db: Session) -> models.PostQueue:
    item = db.query(models.PostQueue).filter(
        models.PostQueue.id == post_id,
        models.PostQueue.user_id == user_id,
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='投稿が見つかりません')
    return item


@router.get('', response_model=List[schemas.PostQueueResponse])
def list_posts(
    post_status: str = 'draft',
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """下書き・承認済み・投稿済みリストを status で絞り込んで返す。
    複数指定可能: ?post_status=draft,approved
    scheduledAt 昇順ソート（要件3）。
    """
    statuses = [s.strip() for s in post_status.split(',') if s.strip()]
    query = db.query(models.PostQueue).filter(
        models.PostQueue.user_id == current_user.id,
        models.PostQueue.status.in_(statuses),
    ).order_by(models.PostQueue.scheduled_at.asc().nullslast(), models.PostQueue.created_at.asc())
    return [schemas.PostQueueResponse.from_model(p) for p in query.all()]


@router.post('/generate', response_model=schemas.PostQueueResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit('10/minute')
def generate_draft(
    request: Request,
    body: schemas.PostGenerateRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """指定テーマのAI生成テキストを下書きとして保存する。承認するまで投稿されない。"""
    theme = db.query(models.PostTheme).filter(
        models.PostTheme.id == body.themeId,
        models.PostTheme.user_id == current_user.id,
    ).first()
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='テーマが見つかりません')

    references = db.query(models.BuzzReference).filter(
        models.BuzzReference.user_id == current_user.id,
    ).order_by(models.BuzzReference.slot_index.asc()).all()
    ref_dicts = [{'label': r.label, 'content': r.content} for r in references]

    try:
        content = gemini_service.generate_post_content(theme.name, theme.description, ref_dicts)
    except Exception as e:
        logger.error('AI生成失敗: %s', e, exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='AI生成に失敗しました。再試行してください')

    post = models.PostQueue(
        user_id=current_user.id,
        theme_id=theme.id,
        theme_name=theme.name,
        content=content,
        status='draft',
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    logger.info('下書き生成: user_id=%s post_id=%s', current_user.id, post.id)
    return schemas.PostQueueResponse.from_model(post)


@router.post('', response_model=schemas.PostQueueResponse, status_code=status.HTTP_201_CREATED)
def create_draft(
    body: schemas.PostCreateRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """手入力テキストを下書きとして保存する。"""
    post = models.PostQueue(
        user_id=current_user.id,
        theme_id=body.themeId,
        theme_name=body.themeName,
        content=body.content,
        status='draft',
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return schemas.PostQueueResponse.from_model(post)


@router.patch('/{post_id}', response_model=schemas.PostQueueResponse)
def edit_post(
    post_id: str,
    body: schemas.PostEditRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """下書きまたは承認済み投稿の本文を編集する（実行1分前までロック解除）。"""
    post = _get_queue_item(post_id, current_user.id, db)

    if post.status not in ('draft', 'approved'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='この投稿は編集できません')

    if post.status == 'approved' and post.scheduled_at:
        now = datetime.now(timezone.utc)
        delta = (post.scheduled_at - now).total_seconds()
        if delta < 60:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='実行1分前を過ぎているため編集できません')

    post.content = body.content
    post.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    return schemas.PostQueueResponse.from_model(post)


@router.post('/{post_id}/approve', response_model=schemas.PostQueueResponse)
def approve_post(
    post_id: str,
    body: schemas.PostApproveRequest,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """下書きを承認して投稿日時を予約確定する（要件1: 承認なしで投稿されない保証）。"""
    post = _get_queue_item(post_id, current_user.id, db)

    if post.status != 'draft':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='下書き状態の投稿のみ承認できます')

    scheduled_at = body.scheduledAt
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

    if scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='投稿日時は現在より未来を指定してください')

    # 1日50件上限チェック（要件2）
    date_str = scheduled_at.date().isoformat()
    day_count = db.query(models.PostQueue).filter(
        models.PostQueue.user_id == current_user.id,
        models.PostQueue.status == 'approved',
        models.PostQueue.scheduled_at >= f'{date_str}T00:00:00+00:00',
        models.PostQueue.scheduled_at < f'{date_str}T23:59:59+00:00',
    ).count()
    if day_count >= _DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'1日の予約上限（{_DAILY_LIMIT}件）に達しています',
        )

    post.status = 'approved'
    post.scheduled_at = scheduled_at
    post.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(post)
    logger.info('投稿承認: user_id=%s post_id=%s scheduled_at=%s', current_user.id, post.id, scheduled_at)
    return schemas.PostQueueResponse.from_model(post)


@router.delete('/{post_id}', status_code=status.HTTP_204_NO_CONTENT)
def cancel_post(
    post_id: str,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """下書きを削除、承認済みを取り消す（要件4）。"""
    post = _get_queue_item(post_id, current_user.id, db)

    if post.status == 'posted':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='投稿済みは取り消せません')

    if post.status == 'approved' and post.scheduled_at:
        delta = (post.scheduled_at - datetime.now(timezone.utc)).total_seconds()
        if delta < 60:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='実行1分前を過ぎているため取り消せません')

    if post.status == 'draft':
        db.delete(post)
    else:
        post.status = 'cancelled'
        post.updated_at = datetime.now(timezone.utc)
    db.commit()
    return None


@router.post('/internal/generate-drafts', status_code=status.HTTP_200_OK)
def generate_drafts_for_all(
    request: Request,
    db: Session = Depends(get_db),
):
    """Cloud Schedulerから呼ばれる下書き自動生成エンドポイント（要件1の核心）。
    アクティブテーマを持つ全ユーザーのAI下書きを生成し post_queue に保存する。
    承認されるまで絶対に投稿されない。
    """
    internal_key = os.getenv('INTERNAL_SECRET', '')
    provided_key = request.headers.get('X-Internal-Key', '')
    if not internal_key or provided_key != internal_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

    # アクティブテーマを持ち、かつThreads連携済みのユーザーを取得
    users_with_theme = db.query(models.User).filter(
        models.User.is_active == True,  # noqa: E712
    ).all()

    results = {'generated': 0, 'skipped': 0, 'failed': 0}

    for user in users_with_theme:
        active_theme = db.query(models.PostTheme).filter(
            models.PostTheme.user_id == user.id,
            models.PostTheme.is_active == True,  # noqa: E712
        ).first()

        if not active_theme:
            results['skipped'] += 1
            continue

        conn = db.query(models.SnsConnection).filter(
            models.SnsConnection.user_id == user.id,
            models.SnsConnection.platform == 'threads',
            models.SnsConnection.is_expired == False,  # noqa: E712
        ).first()

        if not conn:
            results['skipped'] += 1
            continue

        try:
            content = gemini_service.generate_post_content(
                active_theme.name, active_theme.description
            )
            draft = models.PostQueue(
                user_id=user.id,
                theme_id=active_theme.id,
                theme_name=active_theme.name,
                content=content,
                status='draft',
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)
            results['generated'] += 1
            logger.info('下書き自動生成: user_id=%s theme=%s post_id=%s',
                        user.id, active_theme.name, draft.id)
        except Exception as e:
            logger.error('下書き生成失敗: user_id=%s error=%s', user.id, e, exc_info=True)
            results['failed'] += 1

    logger.info('generate-drafts 完了: %s', results)
    return results


@router.post('/internal/run-due', status_code=status.HTTP_200_OK)
def run_due_posts(
    request: Request,
    db: Session = Depends(get_db),
):
    """Cloud Schedulerから毎分呼ばれる実行エンドポイント（要件5）。
    X-Internal-Key ヘッダーで保護。scheduled_at <= now の approved 投稿を全ユーザー分実行。
    """
    internal_key = os.getenv('INTERNAL_SECRET', '')
    provided_key = request.headers.get('X-Internal-Key', '')
    if not internal_key or provided_key != internal_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')

    now = datetime.now(timezone.utc)
    due_posts = db.query(models.PostQueue).filter(
        models.PostQueue.status == 'approved',
        models.PostQueue.scheduled_at <= now,
    ).all()

    results = {'executed': 0, 'failed': 0, 'skipped': 0}

    for post in due_posts:
        conn = db.query(models.SnsConnection).filter(
            models.SnsConnection.user_id == post.user_id,
            models.SnsConnection.platform == 'threads',
            models.SnsConnection.is_expired == False,  # noqa: E712
        ).first()

        if not conn:
            post.status = 'failed'
            post.error_message = 'Threads連携が見つかりません'
            post.updated_at = now
            db.commit()
            results['skipped'] += 1
            continue

        try:
            access_token = crypto.decrypt_token(conn.access_token_encrypted)
            threads_post_id = threads_service.post_to_threads(post.content, access_token, conn.sns_user_id)

            post.status = 'posted'
            post.posted_at = now
            post.threads_post_id = threads_post_id
            post.updated_at = now

            # 投稿履歴にも記録
            history = models.PostHistory(
                user_id=post.user_id,
                theme_id=post.theme_id,
                theme_name=post.theme_name or '手動作成',
                content=post.content,
                posted_at=now,
                status='success',
            )
            db.add(history)
            db.commit()
            results['executed'] += 1
            logger.info('投稿実行: post_id=%s threads_post_id=%s', post.id, threads_post_id)

        except Exception as e:
            logger.error('投稿失敗: post_id=%s error=%s', post.id, e, exc_info=True)
            retry = int(post.retry_count or '0') + 1
            post.retry_count = str(retry)
            if retry >= 3:
                post.status = 'failed'
                post.error_message = str(e)
                history = models.PostHistory(
                    user_id=post.user_id,
                    theme_id=post.theme_id,
                    theme_name=post.theme_name or '手動作成',
                    content=post.content,
                    posted_at=now,
                    status='failed',
                    error_message=str(e),
                )
                db.add(history)
            post.updated_at = now
            db.commit()
            results['failed'] += 1

    logger.info('run-due-posts 完了: %s', results)
    return results
