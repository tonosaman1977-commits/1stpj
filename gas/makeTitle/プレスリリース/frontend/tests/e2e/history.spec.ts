import { test, expect } from '@playwright/test';

test('E2E-HIST-001: 未ログイン時のアクセス拒否', async ({ page }) => {
  // Ensure no auth state in localStorage (unauthenticated)
  await page.context().clearCookies();
  await page.addInitScript(() => {
    localStorage.removeItem('auth');
  });

  await page.goto('/history');

  // Should redirect to /login
  await expect(page).toHaveURL(/\/login/);
});

test('E2E-HIST-002: 投稿履歴がテーブルで表示される', async ({ page }) => {
  // Mock history API to return sample data
  await page.route('**/api/history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          themeId: 'theme-1',
          themeName: 'テストテーマ',
          content: 'テスト投稿内容です。これはサンプルテキストです。',
          postedAt: '2026-03-07T10:00:00Z',
          status: 'success',
        },
        {
          id: '2',
          themeId: 'theme-2',
          themeName: '別テーマ',
          content: '失敗した投稿内容のサンプルです。',
          postedAt: '2026-03-06T09:00:00Z',
          status: 'failed',
          errorMessage: 'Threads API 認証エラー',
        },
      ]),
    });
  });

  // Set auth state in localStorage before page load
  await page.addInitScript(() => {
    localStorage.setItem('auth', JSON.stringify({
      token: 'mock-token',
      user: { id: 'user-1', email: 'demo@example.com', name: 'デモユーザー', role: 'user' },
      isAuthenticated: true,
    }));
  });

  await page.goto('/history');

  // Wait for the table to be visible (not loading state)
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

  // Verify table headers (TC-LIST-02: required columns)
  await expect(page.getByRole('columnheader', { name: '投稿日時' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'テーマ' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '投稿内容（抜粋）' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '状態' })).toBeVisible();

  // Verify data rows are displayed
  await expect(page.getByText('テストテーマ')).toBeVisible();
  await expect(page.getByText('別テーマ')).toBeVisible();

  // Take screenshot for evidence
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-hist-002.png', fullPage: true });
});

test('E2E-HIST-003: 成功レコードに緑・失敗レコードに赤Chipが表示される', async ({ page }) => {
  // Mock /api/history with both success and failed records
  await page.route('**/api/history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          themeId: 'theme-1',
          themeName: 'テストテーマ',
          content: 'テスト投稿内容です。これはサンプルテキストです。',
          postedAt: '2026-03-07T10:00:00Z',
          status: 'success',
        },
        {
          id: '2',
          themeId: 'theme-2',
          themeName: '別テーマ',
          content: '失敗した投稿内容のサンプルです。',
          postedAt: '2026-03-06T09:00:00Z',
          status: 'failed',
          errorMessage: 'Threads API 認証エラー',
        },
      ]),
    });
  });

  // Set auth state in localStorage before page load
  await page.addInitScript(() => {
    localStorage.setItem('auth', JSON.stringify({
      token: 'mock-token',
      user: { id: 'user-1', email: 'demo@example.com', name: 'デモユーザー', role: 'user' },
      isAuthenticated: true,
    }));
  });

  await page.goto('/history');

  // Wait for the table to be visible
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

  // TC-CHIP-01: 成功レコードに緑色Chipが表示される
  const successChip = page.locator('.MuiChip-colorSuccess').first();
  await expect(successChip).toBeVisible();
  await expect(successChip).toHaveText('成功');

  // TC-CHIP-02: 失敗レコードに赤色Chipが表示される
  const errorChip = page.locator('.MuiChip-colorError').first();
  await expect(errorChip).toBeVisible();
  await expect(errorChip).toHaveText('失敗');

  // TC-CHIP-03: 成功と失敗のChipが同一ページで同時表示される
  const allSuccessChips = page.locator('.MuiChip-colorSuccess');
  const allErrorChips = page.locator('.MuiChip-colorError');
  await expect(allSuccessChips).toHaveCount(1);
  await expect(allErrorChips).toHaveCount(1);

  // Take screenshot for evidence
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-hist-003.png', fullPage: true });
});

test('E2E-HIST-004: 行クリックでDialog内に投稿全文が表示される', async ({ page }) => {
  const longContent = 'あ'.repeat(120);

  // Mock /api/history with a record that has 120+ character content
  await page.route('**/api/history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '10',
          themeId: 'theme-10',
          themeName: 'ダイアログテストテーマ',
          content: longContent,
          postedAt: '2026-03-08T10:00:00Z',
          status: 'success',
        },
      ]),
    });
  });

  // Set auth state in localStorage before page load
  await page.addInitScript(() => {
    localStorage.setItem('auth', JSON.stringify({
      token: 'mock-token',
      user: { id: 'user-1', email: 'demo@example.com', name: 'デモユーザー', role: 'user' },
      isAuthenticated: true,
    }));
  });

  await page.goto('/history');

  // Wait for the table to be visible
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

  // TC-DIALOG-01: 行クリックでDialogが開く
  const row = page.getByRole('row').filter({ hasText: 'ダイアログテストテーマ' });
  await row.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // TC-DIALOG-02: Dialog内に投稿全文（省略なし）が表示される
  await expect(dialog).toContainText(longContent);

  // Take screenshot for evidence
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-hist-004.png', fullPage: true });
});

test.only('E2E-HIST-005: 失敗行のDialogにエラー詳細が表示される', async ({ page }) => {
  const errorMessage = '通信タイムアウト';

  // Mock /api/history with a failed record that has errorMessage (TC-DIALOG-04, TC-DIALOG-05)
  await page.route('**/api/history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '20',
          themeId: 'theme-20',
          themeName: 'エラーテストテーマ',
          content: 'この投稿は失敗しました。',
          postedAt: '2026-03-08T12:00:00Z',
          status: 'failed',
          errorMessage: errorMessage,
        },
      ]),
    });
  });

  // Set auth state in localStorage before page load
  await page.addInitScript(() => {
    localStorage.setItem('auth', JSON.stringify({
      token: 'mock-token',
      user: { id: 'user-1', email: 'demo@example.com', name: 'デモユーザー', role: 'user' },
      isAuthenticated: true,
    }));
  });

  await page.goto('/history');

  // Wait for the table to be visible
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

  // TC-DIALOG-04: 失敗行の行をクリックしてDialogを開く
  const row = page.getByRole('row').filter({ hasText: 'エラーテストテーマ' });
  await row.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // TC-DIALOG-04: Dialog内にエラー詳細テキストが表示されている
  await expect(dialog).toContainText('エラー詳細');

  // TC-DIALOG-05: Dialog内のエラー詳細がerror_messageと一致する（「通信タイムアウト」）
  await expect(dialog).toContainText(errorMessage);

  // Take screenshot for evidence
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-hist-005.png', fullPage: true });
});
