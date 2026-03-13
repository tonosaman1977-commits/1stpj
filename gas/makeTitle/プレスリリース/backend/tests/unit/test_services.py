from unittest.mock import MagicMock, patch

import httpx
import pytest

import services.gemini as gemini_service
import services.threads as threads_service


def test_generate_post_content_no_api_key():
    with patch.object(gemini_service, 'GEMINI_API_KEY', ''):
        with pytest.raises(ValueError, match='GEMINI_API_KEY'):
            gemini_service.generate_post_content('テーマ', '説明')


def test_generate_post_content_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        'candidates': [{'content': {'parts': [{'text': 'テスト投稿文 #テスト #AI'}]}}]
    }
    mock_response.raise_for_status = MagicMock()

    with patch.object(gemini_service, 'GEMINI_API_KEY', 'test-key'), \
         patch('httpx.post', return_value=mock_response):
        result = gemini_service.generate_post_content('テーマ', '説明')

    assert result == 'テスト投稿文 #テスト #AI'


def test_post_to_threads_success():
    create_mock = MagicMock()
    create_mock.json.return_value = {'id': 'container-123'}
    create_mock.raise_for_status = MagicMock()

    publish_mock = MagicMock()
    publish_mock.json.return_value = {'id': 'post-456'}
    publish_mock.raise_for_status = MagicMock()

    with patch('httpx.post', side_effect=[create_mock, publish_mock]):
        post_id = threads_service.post_to_threads('テスト投稿 #テスト', 'test-token', 'user-123')

    assert post_id == 'post-456'


def test_post_to_threads_http_error():
    """HTTP エラーが発生した場合は例外が伝播することを確認。"""
    error_mock = MagicMock()
    error_mock.raise_for_status.side_effect = httpx.HTTPStatusError(
        'Error', request=MagicMock(), response=MagicMock()
    )

    with patch('httpx.post', return_value=error_mock):
        with pytest.raises(httpx.HTTPStatusError):
            threads_service.post_to_threads('テスト投稿', 'test-token', 'user-123')


def test_refresh_threads_token_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {'access_token': 'new-token', 'expires_in': 5183944}
    mock_response.raise_for_status = MagicMock()

    with patch('httpx.get', return_value=mock_response):
        result = threads_service.refresh_threads_token('old-token')

    assert result['access_token'] == 'new-token'
    assert result['expires_in'] == 5183944


def test_refresh_threads_token_http_error():
    """リフレッシュAPI失敗時に例外が伝播することを確認。"""
    error_mock = MagicMock()
    error_mock.raise_for_status.side_effect = httpx.HTTPStatusError(
        'Error', request=MagicMock(), response=MagicMock()
    )

    with patch('httpx.get', return_value=error_mock):
        with pytest.raises(httpx.HTTPStatusError):
            threads_service.refresh_threads_token('expired-token')
