import pytest

from schemas import LoginRequest, ScheduleSlotResponse, ThemeCreate


def test_theme_create_valid():
    theme = ThemeCreate(name='テストテーマ', description='説明文')
    assert theme.name == 'テストテーマ'


def test_theme_create_strips_whitespace():
    theme = ThemeCreate(name='  テスト  ', description='説明')
    assert theme.name == 'テスト'


def test_theme_create_empty_name_raises():
    with pytest.raises(Exception):
        ThemeCreate(name='   ', description='説明')


def test_login_request_valid():
    req = LoginRequest(email='test@example.com', password='pass123')
    assert req.email == 'test@example.com'
    assert req.password == 'pass123'


def test_schedule_slot_response_valid():
    slot = ScheduleSlotResponse(id='abc', time='07:00', enabled=True)
    assert slot.time == '07:00'
    assert slot.enabled is True


def test_schedule_slot_response_disabled():
    slot = ScheduleSlotResponse(id='xyz', time='21:00', enabled=False)
    assert slot.enabled is False
