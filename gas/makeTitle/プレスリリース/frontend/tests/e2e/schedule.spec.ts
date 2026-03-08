import { test, expect } from '@playwright/test';

test('E2E-SCHED-001: 未ログイン時のアクセス拒否', async ({ page }) => {
  // localStorageに認証情報を持たない状態（クリーンなセッション）で /schedule にアクセス
  await page.goto('/schedule');

  // /login へリダイレクトされることを確認
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // スクリーンショット保存
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-001.png', fullPage: true });
});

test('E2E-SCHED-002: スロットが常に5件表示される', async ({ page }) => {
  // バックエンドAPIへログインしてtokenを取得し、localStorageにセット
  await page.goto('/');
  await page.evaluate(async () => {
    const res = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const data = await res.json();
    const state = { user: data.user, token: data.token, isAuthenticated: true };
    localStorage.setItem('auth', JSON.stringify(state));
  });

  // /schedule にアクセス
  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });

  // ローディング完了を待つ（CircularProgressが消えるまで）
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // スクリーンショット（スロット表示状態）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-002-loaded.png', fullPage: true });

  // 「スロット N」テキストを持つ要素を数える（SchedulePageの実装に基づく）
  const slots = page.locator('text=/スロット [1-5]/');
  await expect(slots).toHaveCount(5, { timeout: 10000 });

  // スクリーンショット（最終確認）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-002-slots.png', fullPage: true });
});

test('E2E-SCHED-003: 保存済みの時刻とスイッチ状態が初期表示される', async ({ page }) => {
  // テスト用スケジュールデータをAPIで設定
  // スロット1: 08:30 有効、スロット2: 12:15 無効、スロット3: 15:45 有効、
  // スロット4: 19:00 無効、スロット5: 22:30 有効
  await page.goto('/');
  await page.evaluate(async () => {
    const loginRes = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    const token = loginData.token;

    // 既知の状態をAPIで設定
    const slots = [
      { id: 'd3b0c666-9320-449d-ac21-b12a46888d67', time: '08:30', enabled: true },
      { id: '0b70953c-200a-4e28-ae78-a7361bc6c528', time: '12:15', enabled: false },
      { id: '5da9bcb8-121b-4a43-be26-d65a7a0f2c67', time: '15:45', enabled: true },
      { id: 'a93b3668-1967-4a04-9495-faa57404946f', time: '19:00', enabled: false },
      { id: 'd311bb79-93bd-4f6f-8774-13953982c660', time: '22:30', enabled: true },
    ];
    const saveRes = await fetch('http://localhost:8000/api/schedule', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ slots }),
    });
    if (!saveRes.ok) throw new Error(`Schedule save failed: ${saveRes.status}`);

    // localStorageに認証情報をセット
    const state = { user: loginData.user, token, isAuthenticated: true };
    localStorage.setItem('auth', JSON.stringify(state));
  });

  // /schedule にアクセス
  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });

  // ローディング完了を待つ
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // スクリーンショット（ページ読み込み直後）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-003-loaded.png', fullPage: true });

  // 5件のスロットが表示されていることを確認
  const slots = page.locator('text=/スロット [1-5]/');
  await expect(slots).toHaveCount(5, { timeout: 10000 });

  // 時刻フィールドを取得（type="time" の input）
  const timeInputs = page.locator('input[type="time"]');
  await expect(timeInputs).toHaveCount(5, { timeout: 10000 });

  // TC-LIST-03: 保存済みの時刻が初期表示されている
  await expect(timeInputs.nth(0)).toHaveValue('08:30');
  await expect(timeInputs.nth(1)).toHaveValue('12:15');
  await expect(timeInputs.nth(2)).toHaveValue('15:45');
  await expect(timeInputs.nth(3)).toHaveValue('19:00');
  await expect(timeInputs.nth(4)).toHaveValue('22:30');

  // TC-LIST-04: 保存済みのスイッチ状態が初期表示されている
  // スイッチは role="checkbox" として取得
  const switches = page.locator('input[type="checkbox"]');
  await expect(switches).toHaveCount(5, { timeout: 10000 });

  // スロット1: 有効（checked）
  await expect(switches.nth(0)).toBeChecked();
  // スロット2: 無効（unchecked）
  await expect(switches.nth(1)).not.toBeChecked();
  // スロット3: 有効（checked）
  await expect(switches.nth(2)).toBeChecked();
  // スロット4: 無効（unchecked）
  await expect(switches.nth(3)).not.toBeChecked();
  // スロット5: 有効（checked）
  await expect(switches.nth(4)).toBeChecked();

  // 無効スロットの時刻入力フィールドがdisabledになっているか確認
  await expect(timeInputs.nth(1)).toBeDisabled();
  await expect(timeInputs.nth(3)).toBeDisabled();
  // 有効スロットの時刻入力フィールドがenabledになっているか確認
  await expect(timeInputs.nth(0)).toBeEnabled();
  await expect(timeInputs.nth(2)).toBeEnabled();
  await expect(timeInputs.nth(4)).toBeEnabled();

  // スクリーンショット（最終確認）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-003-verified.png', fullPage: true });
});

test('E2E-SCHED-004: スイッチOFFで時刻入力がdisabledになる', async ({ page }) => {
  // ログイン済み状態を設定
  await page.goto('/');
  await page.evaluate(async () => {
    const loginRes = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    const state = { user: loginData.user, token: loginData.token, isAuthenticated: true };
    localStorage.setItem('auth', JSON.stringify(state));
  });

  // /schedule にアクセス
  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });

  // ローディング完了を待つ
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // スロットが5件表示されていることを確認
  const slots = page.locator('text=/スロット [1-5]/');
  await expect(slots).toHaveCount(5, { timeout: 10000 });

  const timeInputs = page.locator('input[type="time"]');
  const switches = page.locator('input[type="checkbox"]');
  await expect(timeInputs).toHaveCount(5, { timeout: 10000 });
  await expect(switches).toHaveCount(5, { timeout: 10000 });

  // スクリーンショット（初期状態）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-004-initial.png', fullPage: true });

  // TC-SW-02: 既にOFFのスロットの時刻入力フィールドがdisabledになっているか確認
  // まず全スロットのスイッチ状態を確認し、OFFのものを探す
  let offSlotIndex = -1;
  for (let i = 0; i < 5; i++) {
    const isChecked = await switches.nth(i).isChecked();
    if (!isChecked) {
      offSlotIndex = i;
      break;
    }
  }

  // OFFのスロットがある場合はそのスロットの時刻入力がdisabledであることを確認
  if (offSlotIndex >= 0) {
    await expect(timeInputs.nth(offSlotIndex)).toBeDisabled();
  }

  // TC-SW-03: ONのスロットのスイッチをOFFに切り替え → 時刻入力がdisabledになることを確認
  let onSlotIndex = -1;
  for (let i = 0; i < 5; i++) {
    const isChecked = await switches.nth(i).isChecked();
    if (isChecked) {
      onSlotIndex = i;
      break;
    }
  }

  // ONのスロットが見つからない場合はスロット0をONにしてからテスト
  if (onSlotIndex < 0) {
    // 全スロットがOFFの場合、スロット0のスイッチをONにする
    await switches.nth(0).click();
    await page.waitForTimeout(300);
    onSlotIndex = 0;
  }

  // 対象スロットの時刻入力がenabledであることを確認
  await expect(timeInputs.nth(onSlotIndex)).toBeEnabled();

  // スイッチをOFFに切り替え
  await switches.nth(onSlotIndex).click();
  await page.waitForTimeout(300);

  // スクリーンショット（スイッチOFF後）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-004-switch-off.png', fullPage: true });

  // 時刻入力フィールドがdisabledになっていることを確認（TC-SW-03の期待結果）
  await expect(timeInputs.nth(onSlotIndex)).toBeDisabled();

  // スクリーンショット（最終確認）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-004-verified.png', fullPage: true });
});

test('E2E-SCHED-005: スイッチONで時刻入力がenabledになる', async ({ page }) => {
  // ログイン済み状態を設定
  await page.goto('/');
  await page.evaluate(async () => {
    const loginRes = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    const state = { user: loginData.user, token: loginData.token, isAuthenticated: true };
    localStorage.setItem('auth', JSON.stringify(state));
  });

  // /schedule にアクセス
  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });

  // ローディング完了を待つ
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // スロットが5件表示されていることを確認
  const slots = page.locator('text=/スロット [1-5]/');
  await expect(slots).toHaveCount(5, { timeout: 10000 });

  const timeInputs = page.locator('input[type="time"]');
  const switches = page.locator('input[type="checkbox"]');
  await expect(timeInputs).toHaveCount(5, { timeout: 10000 });
  await expect(switches).toHaveCount(5, { timeout: 10000 });

  // スクリーンショット（初期状態）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-005-initial.png', fullPage: true });

  // TC-SW-04: OFFのスロットのスイッチをONに切り替え → 時刻入力がenabledになることを確認
  // まずOFFのスロットを探す
  let offSlotIndex = -1;
  for (let i = 0; i < 5; i++) {
    const isChecked = await switches.nth(i).isChecked();
    if (!isChecked) {
      offSlotIndex = i;
      break;
    }
  }

  // OFFのスロットが見つからない場合はスロット0をOFFにしてからテスト
  if (offSlotIndex < 0) {
    await switches.nth(0).click();
    await page.waitForTimeout(300);
    offSlotIndex = 0;
  }

  // 対象スロットの時刻入力がdisabledであることを確認（前提条件）
  await expect(timeInputs.nth(offSlotIndex)).toBeDisabled();

  // スクリーンショット（スイッチON前）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-005-before-on.png', fullPage: true });

  // スイッチをONに切り替え
  await switches.nth(offSlotIndex).click();
  await page.waitForTimeout(300);

  // スクリーンショット（スイッチON後）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-005-switch-on.png', fullPage: true });

  // TC-SW-04: 時刻入力フィールドがenabledになっていることを確認
  await expect(timeInputs.nth(offSlotIndex)).toBeEnabled();

  // TC-SW-01: スイッチがONのスロットの時刻入力フィールドがenabledであることを確認
  await expect(switches.nth(offSlotIndex)).toBeChecked();

  // スクリーンショット（最終確認）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-005-verified.png', fullPage: true });
});

test('E2E-SCHED-006: 保存ボタン押下でSnackbar成功メッセージが表示される', async ({ page }) => {
  // ログイン済み状態を設定
  await page.goto('/');
  await page.evaluate(async () => {
    const loginRes = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    const state = { user: loginData.user, token: loginData.token, isAuthenticated: true };
    localStorage.setItem('auth', JSON.stringify(state));
  });

  // /schedule にアクセス
  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });

  // ローディング完了を待つ
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // スクリーンショット（初期状態）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-006-initial.png', fullPage: true });

  // 「保存」ボタンをクリック
  const saveButton = page.getByRole('button', { name: '保存' });
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.click();

  // Snackbar成功メッセージが表示されることを確認（TC-SAVE-02）
  const snackbar = page.locator('[role="alert"]').filter({ hasText: 'スケジュールを保存しました' });
  await expect(snackbar).toBeVisible({ timeout: 10000 });

  // スクリーンショット（Snackbar表示確認）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-006-snackbar.png', fullPage: true });
});

test.only('E2E-SCHED-007: 保存した設定がページリロード後も保持される', async ({ page }) => {
  // ログインしてtokenを取得し、既知の状態をAPIで設定してからlocalStorageにセット
  await page.goto('/');
  await page.evaluate(async () => {
    const loginRes = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@example.com', password: 'demo123' }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    const token = loginData.token;
    const state = { user: loginData.user, token, isAuthenticated: true };
    localStorage.setItem('auth', JSON.stringify(state));
  });

  // /schedule にアクセスしてページが表示されるのを待つ
  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // スロット・スイッチ・時刻入力を取得
  const slots = page.locator('text=/スロット [1-5]/');
  await expect(slots).toHaveCount(5, { timeout: 10000 });

  const timeInputs = page.locator('input[type="time"]');
  const switches = page.locator('input[type="checkbox"]');
  await expect(timeInputs).toHaveCount(5, { timeout: 10000 });
  await expect(switches).toHaveCount(5, { timeout: 10000 });

  // スクリーンショット（初期状態）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-007-initial.png', fullPage: true });

  // テスト用の値を設定: スロット1の時刻を変更し、スロット2のスイッチ状態を変更する
  // スロット1の時刻を「07:30」に設定（有効状態を確保してから）
  const slot1Switch = switches.nth(0);
  const slot1IsChecked = await slot1Switch.isChecked();
  if (!slot1IsChecked) {
    await slot1Switch.click();
    await page.waitForTimeout(300);
  }
  await timeInputs.nth(0).fill('07:30');

  // スロット2のスイッチをOFFに切り替え（現在ONの場合）、時刻も設定
  const slot2Switch = switches.nth(1);
  const slot2IsChecked = await slot2Switch.isChecked();
  if (!slot2IsChecked) {
    // OFFならONにしてから時刻設定
    await slot2Switch.click();
    await page.waitForTimeout(300);
  }
  await timeInputs.nth(1).fill('14:00');
  // スロット2をOFFに切り替え
  await slot2Switch.click();
  await page.waitForTimeout(300);

  // スクリーンショット（変更後・保存前）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-007-before-save.png', fullPage: true });

  // 「保存」ボタンをクリック
  const saveButton = page.getByRole('button', { name: '保存' });
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.click();

  // Snackbar成功メッセージが表示されることを確認（TC-SAVE-02）
  const snackbar = page.locator('[role="alert"]').filter({ hasText: 'スケジュールを保存しました' });
  await expect(snackbar).toBeVisible({ timeout: 10000 });

  // スクリーンショット（保存後・リロード前）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-007-after-save.png', fullPage: true });

  // ページをリロード
  await page.reload();
  await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // スクリーンショット（リロード後）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-007-after-reload.png', fullPage: true });

  // リロード後もスロット5件が表示されることを確認
  const reloadedSlots = page.locator('text=/スロット [1-5]/');
  await expect(reloadedSlots).toHaveCount(5, { timeout: 10000 });

  const reloadedTimeInputs = page.locator('input[type="time"]');
  const reloadedSwitches = page.locator('input[type="checkbox"]');
  await expect(reloadedTimeInputs).toHaveCount(5, { timeout: 10000 });
  await expect(reloadedSwitches).toHaveCount(5, { timeout: 10000 });

  // TC-SAVE-04: リロード後もスロット1の時刻「07:30」が保持されていることを確認
  await expect(reloadedTimeInputs.nth(0)).toHaveValue('07:30');

  // TC-SAVE-04: リロード後もスロット1が有効（checked）であることを確認
  await expect(reloadedSwitches.nth(0)).toBeChecked();

  // TC-SAVE-04: リロード後もスロット2が無効（unchecked）であることを確認
  await expect(reloadedSwitches.nth(1)).not.toBeChecked();

  // TC-SAVE-04: リロード後もスロット2の時刻入力がdisabledであることを確認
  await expect(reloadedTimeInputs.nth(1)).toBeDisabled();

  // スクリーンショット（最終確認）
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-sched-007-verified.png', fullPage: true });
});
