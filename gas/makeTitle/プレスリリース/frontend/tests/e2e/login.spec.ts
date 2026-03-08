import { test, expect } from '@playwright/test';

test('E2E-LOGIN-001: ログインフォームが表示される', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByLabel('メールアドレス')).toBeVisible();
  await expect(page.getByLabel('パスワード')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
});

test('E2E-LOGIN-002: ログイン済み状態で/loginにアクセスするとダッシュボードへリダイレクト', async ({ page }) => {
  // ログイン済み状態をlocalStorageで設定
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('auth', JSON.stringify({
      user: { id: 1, email: 'demo@example.com', name: 'Demo User' },
      token: 'dummy-token',
      isAuthenticated: true,
    }));
  });

  // /login に再アクセス
  await page.goto('/login');

  // /dashboard へリダイレクトされることを確認
  await expect(page).toHaveURL(/\/dashboard/);
});

test('E2E-LOGIN-003: 正しい認証情報でログインするとダッシュボードへ遷移する', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('メールアドレス').fill('demo@example.com');
  await page.getByLabel('パスワード').fill('demo123');
  await page.getByRole('button', { name: 'ログイン' }).click();

  // /dashboard へリダイレクトされることを確認
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
});

test('E2E-LOGIN-004: ログイン中はボタンが無効化されスピナーが表示される', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('メールアドレス').fill('demo@example.com');
  await page.getByLabel('パスワード').fill('demo123');

  // fetchをモンキーパッチしてAPIレスポンスを遅延させ、ローディング状態を確認できるようにする
  await page.evaluate(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : String(args[0]));
      if (url && url.includes('auth/login')) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      return originalFetch(...args);
    };
  });

  // フォームのsubmitイベントを発火してログイン処理を開始
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  // Reactの状態更新を待つ
  await page.waitForTimeout(300);

  // ボタンが無効化されていることを確認
  await expect(page.locator('button[type="submit"]')).toBeDisabled();

  // ボタンテキストが「ログイン中...」になっていることを確認
  await expect(page.locator('button[type="submit"]')).toHaveText(/ログイン中/);

  // スピナー（MUI CircularProgress = role=progressbar）が表示されていることを確認
  await expect(page.locator('button[type="submit"] [role="progressbar"]')).toBeVisible();

  // スクリーンショット保存
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-login-004-loading.png', fullPage: true });
});

test('E2E-LOGIN-005: 誤ったパスワードでエラーが表示される', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('メールアドレス').fill('demo@example.com');
  await page.getByLabel('パスワード').fill('wrongpassword');
  await page.getByRole('button', { name: 'ログイン' }).click();

  // エラーアラートが表示されることを確認
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });

  // ログインページに留まることを確認
  await expect(page).toHaveURL(/\/login/);

  // スクリーンショット保存
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-login-005.png', fullPage: true });
});

test.only('E2E-LOGIN-006: 空フィールドではブラウザバリデーションが動作する', async ({ page }) => {
  await page.goto('/login');

  // メールアドレス・パスワードを空のままログインボタンをクリック
  await page.getByRole('button', { name: 'ログイン' }).click();

  // フォームが送信されていないこと（URLがログインページのまま）を確認
  await expect(page).toHaveURL(/\/login/);

  // ブラウザの HTML5 バリデーション: email フィールドが validity.valid = false であることを確認
  const emailValid = await page.evaluate(() => {
    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
    return input ? input.validity.valid : null;
  });
  expect(emailValid).toBe(false);

  // スクリーンショット保存
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-login-006.png', fullPage: true });
});
