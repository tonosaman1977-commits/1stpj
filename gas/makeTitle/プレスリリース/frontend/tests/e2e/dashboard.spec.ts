import { test, expect } from '@playwright/test';

test('E2E-DASH-001: 未ログイン時のアクセス拒否', async ({ page }) => {
  // Ensure no auth state in localStorage (unauthenticated)
  await page.context().clearCookies();
  await page.addInitScript(() => {
    localStorage.removeItem('auth');
  });

  await page.goto('/dashboard');

  // Should redirect to /login
  await expect(page).toHaveURL(/\/login/);
});

test('E2E-DASH-002: ログイン済みユーザーのアクセス許可', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard after login
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // Dashboard page should be displayed (h5 heading in main content)
  await expect(page.getByRole('main').getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
});

test('E2E-DASH-003: 3つの統計カードが表示される', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard after login
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // Wait for loading to finish (CircularProgress disappears)
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // Verify all 3 stat card labels are visible (exact match to avoid substring conflicts)
  await expect(page.getByText('今日の投稿', { exact: true })).toBeVisible();
  await expect(page.getByText('次回投稿', { exact: true })).toBeVisible();
  await expect(page.getByText('アクティブテーマ', { exact: true })).toBeVisible();
});

test('E2E-DASH-004: ローディング中にスピナーが表示される', async ({ page }) => {
  // Intercept API calls and delay them to capture loading state
  await page.route('**/api/**', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await route.continue();
  });

  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');

  // Intercept login API as well (delay all API calls)
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // CircularProgress should be visible during loading (role="progressbar")
  await expect(page.locator('[role="progressbar"]')).toBeVisible({ timeout: 5000 });

  // Stat cards should NOT be visible during loading
  await expect(page.getByText('今日の投稿', { exact: true })).not.toBeVisible();
});

test('E2E-DASH-005: 直近の投稿が最大5件表示される', async ({ page }) => {
  // Mock the history API to return 7 posts (more than 5)
  await page.route('**/api/history', async (route) => {
    const mockHistory = Array.from({ length: 7 }, (_, i) => ({
      id: `post-${i + 1}`,
      themeId: `theme-1`,
      themeName: 'テストテーマ',
      content: `テスト投稿内容 ${i + 1}`,
      postedAt: new Date(Date.now() - i * 3600000).toISOString(),
      status: 'success',
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockHistory),
    });
  });

  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // Wait for loading to finish
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // Verify '直近の投稿' section heading is visible
  await expect(page.getByText('直近の投稿', { exact: true })).toBeVisible();

  // Count post cards: each post card has a Chip with テストテーマ
  const postCards = page.locator('.MuiCard-root').filter({ hasText: 'テストテーマ' });
  const count = await postCards.count();

  // Should be at most 5 (DashboardPage uses history.slice(0, 5))
  expect(count).toBeLessThanOrEqual(5);
  expect(count).toBeGreaterThanOrEqual(1);
});

test('E2E-DASH-006: 投稿履歴が0件の場合に空メッセージが表示される', async ({ page }) => {
  // Mock the history API to return empty array
  await page.route('**/api/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // Wait for loading to finish
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // Empty message should be displayed
  await expect(page.getByText('投稿履歴がありません')).toBeVisible();
});

test.only('E2E-DASH-007: 投稿カードに時刻・テーマ・状態Chipが表示される', async ({ page }) => {
  const mockPosts = [
    {
      id: 'post-1',
      themeId: 'theme-1',
      themeName: 'テストテーマA',
      content: 'テスト投稿内容1',
      postedAt: new Date('2026-03-08T10:30:00').toISOString(),
      status: 'success',
    },
    {
      id: 'post-2',
      themeId: 'theme-2',
      themeName: 'テストテーマB',
      content: 'テスト投稿内容2',
      postedAt: new Date('2026-03-08T09:15:00').toISOString(),
      status: 'failure',
    },
  ];

  await page.route('**/api/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPosts),
    });
  });

  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // Wait for loading to finish
  await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

  // Verify post cards are visible
  const postCards = page.locator('.MuiCard-root').filter({ hasText: 'テストテーマA' });
  await expect(postCards.first()).toBeVisible();

  // Card 1: success post - verify time, theme chip, and success chip
  const card1 = page.locator('.MuiCard-root').filter({ hasText: 'テストテーマA' }).first();
  await expect(card1.getByText('10:30')).toBeVisible();
  await expect(card1.getByText('テストテーマA')).toBeVisible();
  await expect(card1.getByText('成功')).toBeVisible();

  // Card 2: failure post - verify time, theme chip, and failure chip
  const card2 = page.locator('.MuiCard-root').filter({ hasText: 'テストテーマB' }).first();
  await expect(card2.getByText('09:15')).toBeVisible();
  await expect(card2.getByText('テストテーマB')).toBeVisible();
  await expect(card2.getByText('失敗')).toBeVisible();
});
