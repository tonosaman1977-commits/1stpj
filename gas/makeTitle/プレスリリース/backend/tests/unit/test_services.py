from unittest.mock import MagicMock, patch

import pytest

import services.gemini as gemini_service
import services.threads as threads_service


def test_generate_post_content_no_api_key():
    with patch.object(gemini_service, 'GEMINI_API_KEY', ''):
        with pytest.raises(ValueError, match='GEMINI_API_KEY'):
            gemini_service.generate_post_content('テーマ', '説明')


def test_post_to_threads_no_credentials():
    with patch.object(threads_service, 'THREADS_ACCESS_TOKEN', ''), \
         patch.object(threads_service, 'THREADS_USER_ID', ''):
        with pytest.raises(ValueError, match='Threads API認証情報'):
            threads_service.post_to_threads('テスト投稿')


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

    with patch.object(threads_service, 'THREADS_ACCESS_TOKEN', 'token'), \
         patch.object(threads_service, 'THREADS_USER_ID', 'user-id'), \
         patch('httpx.post', side_effect=[create_mock, publish_mock]):
        post_id = threads_service.post_to_threads('テスト投稿 #テスト')

    assert post_id == 'post-456'
