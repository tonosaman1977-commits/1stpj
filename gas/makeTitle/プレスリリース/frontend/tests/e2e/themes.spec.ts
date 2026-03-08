import { test, expect } from '@playwright/test';

test('E2E-THEMES-003: アクティブテーマにバッジと枠線強調が表示される', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  // isActive: true のテーマをAPIで事前作成
  const createRes = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'E2Eアクティブテーマ-003', description: 'E2E-THEMES-003 自動テスト用' },
  });
  const createdTheme = await createRes.json();
  const themeId: string = createdTheme.id;

  // 作成直後にアクティブ化
  await request.post(`http://localhost:8000/api/themes/${themeId}/activate`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット保存
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-003.png', fullPage: true });

    // アクティブテーマのカードを特定（「アクティブ」バッジが含まれるカード）
    const activeCard = page.locator('.MuiCard-root').filter({ hasText: 'アクティブ' }).first();
    await expect(activeCard).toBeVisible({ timeout: 10000 });

    // 「アクティブ」バッジ（Chip）が表示されていること
    const activeBadge = activeCard.locator('.MuiChip-root', { hasText: 'アクティブ' });
    await expect(activeBadge).toBeVisible();

    // 枠線強調: borderWidth=2 かつ borderColor が primary.main であることを確認
    // MUI の variant="outlined" + sx で border-width:2px が適用されていることを検証
    const cardElement = activeCard.locator('div.MuiCard-root').first();
    // activeCard 自身のスタイルを評価
    const borderWidth = await activeCard.evaluate((el) => {
      return window.getComputedStyle(el).borderWidth;
    });
    expect(borderWidth).toBe('2px');

    // 念のためテーマ名が表示されていることも確認
    await expect(activeCard).toContainText('E2Eアクティブテーマ-003');

    // スクリーンショット（検証後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-003-verified.png', fullPage: true });
  } finally {
    // クリーンアップ: テーマを削除
    await request.delete(`http://localhost:8000/api/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test('E2E-THEMES-001: 未ログイン時のアクセス拒否', async ({ page }) => {
  // localStorageを空にした状態（未ログイン）で/themesにアクセス
  await page.goto('/themes');

  // /login へリダイレクトされることを確認
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  // スクリーンショット保存
  await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-001.png', fullPage: true });
});

test('E2E-THEMES-004: 「テーマを追加」ボタンでダイアログが開く', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  // テスト用テーマをAPIで事前作成（テーマ一覧が表示されるために必要）
  const createRes = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'E2Eテスト用テーマ-004', description: 'E2E-THEMES-004 自動テスト用' },
  });
  const createdTheme = await createRes.json();
  const themeId: string = createdTheme.id;

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（ボタンクリック前）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-004-before.png', fullPage: true });

    // 「テーマを追加」ボタンをクリック
    const addButton = page.getByRole('button', { name: 'テーマを追加' });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // ダイアログが表示されるまで待機
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // スクリーンショット（ダイアログ表示後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-004-dialog.png', fullPage: true });

    // ダイアログのタイトルが「テーマを追加」であること
    await expect(dialog.getByText('テーマを追加')).toBeVisible();

    // テーマ名入力フォームが存在すること
    const nameField = dialog.getByLabel('テーマ名');
    await expect(nameField).toBeVisible();

    // 説明入力フォームが存在すること
    const descField = dialog.getByLabel('説明');
    await expect(descField).toBeVisible();

    // スクリーンショット（検証後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-004-verified.png', fullPage: true });
  } finally {
    // クリーンアップ: テーマを削除
    await request.delete(`http://localhost:8000/api/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test('E2E-THEMES-005: テーマ名と説明を入力して登録できる', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  // テスト用テーマ名（ユニーク）
  const themeName = `E2E-THEMES-005-テストテーマ-${Date.now()}`;

  let createdThemeId: string | null = null;

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（追加ボタンクリック前）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-005-before.png', fullPage: true });

    // 追加前のカード数を記録
    const cardsBefore = await page.locator('.MuiCard-root').count();

    // 「テーマを追加」ボタンをクリック（ページヘッダー部分の contained ボタンを厳密に指定）
    const addButton = page.locator('button.MuiButton-contained', { hasText: 'テーマを追加' });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // ダイアログが表示されるまで待機
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // テーマ名と説明を入力
    const nameField = dialog.getByLabel('テーマ名');
    await expect(nameField).toBeVisible();
    await nameField.fill(themeName);

    const descField = dialog.getByLabel('説明');
    await expect(descField).toBeVisible();
    await descField.fill('テスト用の説明文');

    // スクリーンショット（入力後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-005-filled.png', fullPage: true });

    // 登録ボタンをクリック
    const submitButton = dialog.getByRole('button', { name: '追加' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // ダイアログが閉じることを確認
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // 新しいテーマが一覧に表示されるまで待機（データ再読み込み完了を兼ねる）
    const newCard = page.locator('.MuiCard-root').filter({ hasText: themeName });
    await expect(newCard).toBeVisible({ timeout: 15000 });

    // スクリーンショット（登録後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-005-after.png', fullPage: true });

    // カード数が追加前より増えていること
    const cardsAfter = await page.locator('.MuiCard-root').count();
    expect(cardsAfter).toBeGreaterThan(cardsBefore);

    // 説明文も正しく表示されていること
    await expect(newCard).toContainText('テスト用の説明文');

    // スクリーンショット（検証後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-005-verified.png', fullPage: true });

    // クリーンアップ用にAPIでテーマIDを取得
    const themesRes = await request.get('http://localhost:8000/api/themes', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const themes = await themesRes.json();
    const created = themes.find((t: { name: string; id: string }) => t.name === themeName);
    if (created) createdThemeId = created.id;
  } finally {
    // クリーンアップ: テーマを削除
    if (createdThemeId) {
      await request.delete(`http://localhost:8000/api/themes/${createdThemeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
});

test('E2E-THEMES-006: 編集アイコンで既存データがフォームに初期表示された編集ダイアログが開く', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  const themeName = `E2E-THEMES-006-旧テーマ名-${Date.now()}`;
  const themeDesc = '旧説明-E2E-THEMES-006';

  // テスト用テーマをAPIで事前作成
  const createRes = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: themeName, description: themeDesc },
  });
  const createdTheme = await createRes.json();
  const themeId: string = createdTheme.id;

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（編集アイコンクリック前）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-006-before.png', fullPage: true });

    // 作成したテーマのカードを特定し、編集アイコンをクリック
    const targetCard = page.locator('.MuiCard-root').filter({ hasText: themeName });
    await expect(targetCard).toBeVisible({ timeout: 10000 });

    const editButton = targetCard.locator('button[aria-label="編集"]');
    await expect(editButton).toBeVisible();
    await editButton.click();

    // 編集ダイアログが表示されるまで待機
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // スクリーンショット（ダイアログ表示後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-006-dialog.png', fullPage: true });

    // ダイアログタイトルが「テーマを編集」であること
    await expect(dialog.getByText('テーマを編集')).toBeVisible();

    // テーマ名フィールドに既存のテーマ名が初期表示されていること
    const nameField = dialog.getByLabel('テーマ名');
    await expect(nameField).toBeVisible();
    await expect(nameField).toHaveValue(themeName);

    // 説明フィールドに既存の説明が初期表示されていること
    const descField = dialog.getByLabel('説明');
    await expect(descField).toBeVisible();
    await expect(descField).toHaveValue(themeDesc);

    // スクリーンショット（検証後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-006-verified.png', fullPage: true });
  } finally {
    // クリーンアップ: テーマを削除
    await request.delete(`http://localhost:8000/api/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test('E2E-THEMES-007: テーマ名と説明を更新できる', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  const originalName = `E2E-THEMES-007-旧テーマ名-${Date.now()}`;
  const originalDesc = '旧説明-E2E-THEMES-007';

  // テスト用テーマをAPIで事前作成
  const createRes = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: originalName, description: originalDesc },
  });
  const createdTheme = await createRes.json();
  const themeId: string = createdTheme.id;

  const newName = `E2E-THEMES-007-新テーマ名-${Date.now()}`;
  const newDesc = '新説明-E2E-THEMES-007';

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（編集前）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-007-before.png', fullPage: true });

    // 作成したテーマのカードを特定し、編集アイコンをクリック
    const targetCard = page.locator('.MuiCard-root').filter({ hasText: originalName });
    await expect(targetCard).toBeVisible({ timeout: 10000 });

    const editButton = targetCard.locator('button[aria-label="編集"]');
    await expect(editButton).toBeVisible();
    await editButton.click();

    // 編集ダイアログが表示されるまで待機
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // スクリーンショット（ダイアログ表示後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-007-dialog.png', fullPage: true });

    // テーマ名を新しい値に変更
    const nameField = dialog.getByLabel('テーマ名');
    await expect(nameField).toBeVisible();
    await nameField.clear();
    await nameField.fill(newName);

    // 説明を新しい値に変更
    const descField = dialog.getByLabel('説明');
    await expect(descField).toBeVisible();
    await descField.clear();
    await descField.fill(newDesc);

    // スクリーンショット（入力後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-007-filled.png', fullPage: true });

    // 保存ボタンをクリック
    const saveButton = dialog.getByRole('button', { name: '保存' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // ダイアログが閉じることを確認
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // ローディングスピナーが消えるまで待機（データ再読み込み）
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（保存後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-007-after.png', fullPage: true });

    // 更新後のテーマ名がカードに表示されていること
    const updatedCard = page.locator('.MuiCard-root').filter({ hasText: newName });
    await expect(updatedCard).toBeVisible({ timeout: 15000 });

    // 更新後の説明もカードに表示されていること
    await expect(updatedCard).toContainText(newDesc);

    // 旧テーマ名はカードに表示されなくなっていること
    await expect(page.locator('.MuiCard-root').filter({ hasText: originalName })).not.toBeVisible();

    // スクリーンショット（検証後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-007-verified.png', fullPage: true });
  } finally {
    // クリーンアップ: テーマを削除（IDで直接削除）
    await request.delete(`http://localhost:8000/api/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test('E2E-THEMES-008: 削除確認OKでテーマが削除される', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  // テスト用テーマをAPIで事前作成
  const themeName = `E2E-THEMES-008-削除テスト-${Date.now()}`;
  const createRes = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: themeName, description: 'E2E-THEMES-008 削除テスト用' },
  });
  const createdTheme = await createRes.json();
  const themeId: string = createdTheme.id;

  let deleted = false;

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（削除前）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-008-before.png', fullPage: true });

    // 対象テーマのカードが表示されていることを確認
    const targetCard = page.locator('.MuiCard-root').filter({ hasText: themeName });
    await expect(targetCard).toBeVisible({ timeout: 10000 });

    // confirmダイアログを自動的にOKで受け入れる
    page.on('dialog', dialog => dialog.accept());

    // 削除アイコンをクリック
    const deleteButton = targetCard.locator('button[aria-label="削除"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // スクリーンショット（削除後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-008-after.png', fullPage: true });

    // ローディングスピナーが消えるまで待機（データ再読み込み）
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // 対象テーマが一覧から消えていることを確認
    await expect(page.locator('.MuiCard-root').filter({ hasText: themeName })).not.toBeVisible({ timeout: 15000 });

    // スクリーンショット（検証後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-008-verified.png', fullPage: true });

    deleted = true;
  } finally {
    // クリーンアップ: テーマが残っている場合のみ削除
    if (!deleted) {
      await request.delete(`http://localhost:8000/api/themes/${themeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
});

test('E2E-THEMES-009: 「アクティブにする」ボタンでアクティブテーマが切り替わる', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  // テーマA（最初にアクティブ化）とテーマB（切り替え先）を作成
  const themeAName = `E2E-009-テーマA-${Date.now()}`;
  const themeBName = `E2E-009-テーマB-${Date.now()}`;

  const createResA = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: themeAName, description: 'E2E-THEMES-009 テーマA' },
  });
  const themeA = await createResA.json();
  const themeAId: string = themeA.id;

  const createResB = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: themeBName, description: 'E2E-THEMES-009 テーマB' },
  });
  const themeB = await createResB.json();
  const themeBId: string = themeB.id;

  // テーマAをアクティブ化（切り替え元）
  await request.post(`http://localhost:8000/api/themes/${themeAId}/activate`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（切り替え前）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-009-before.png', fullPage: true });

    // テーマAカードに「アクティブ」バッジが表示されていることを確認
    const cardA = page.locator('.MuiCard-root').filter({ hasText: themeAName });
    await expect(cardA).toBeVisible({ timeout: 10000 });
    const badgeA = cardA.locator('.MuiChip-root', { hasText: 'アクティブ' });
    await expect(badgeA).toBeVisible({ timeout: 5000 });

    // テーマBカードに「アクティブ」バッジがないことを確認
    const cardB = page.locator('.MuiCard-root').filter({ hasText: themeBName });
    await expect(cardB).toBeVisible({ timeout: 10000 });
    const badgeBefore = cardB.locator('.MuiChip-root', { hasText: 'アクティブ' });
    await expect(badgeBefore).not.toBeVisible();

    // テーマBの「アクティブにする」ボタンをクリック
    const activateBtn = cardB.getByRole('button', { name: 'アクティブにする' });
    await expect(activateBtn).toBeVisible({ timeout: 5000 });
    await activateBtn.click();

    // ローディングスピナーが消えるまで待機（データ再読み込み）
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（切り替え後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-009-after.png', fullPage: true });

    // テーマBに「アクティブ」バッジが移っていることを確認
    const cardBAfter = page.locator('.MuiCard-root').filter({ hasText: themeBName });
    await expect(cardBAfter).toBeVisible({ timeout: 10000 });
    const badgeBAfter = cardBAfter.locator('.MuiChip-root', { hasText: 'アクティブ' });
    await expect(badgeBAfter).toBeVisible({ timeout: 10000 });

    // テーマAから「アクティブ」バッジが消えていることを確認
    const cardAAfter = page.locator('.MuiCard-root').filter({ hasText: themeAName });
    await expect(cardAAfter).toBeVisible({ timeout: 10000 });
    const badgeAAfter = cardAAfter.locator('.MuiChip-root', { hasText: 'アクティブ' });
    await expect(badgeAAfter).not.toBeVisible({ timeout: 5000 });

    // スクリーンショット（検証後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-009-verified.png', fullPage: true });
  } finally {
    // クリーンアップ: テーマA・Bを削除
    await request.delete(`http://localhost:8000/api/themes/${themeAId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await request.delete(`http://localhost:8000/api/themes/${themeBId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test.only('E2E-THEMES-010: テーマ名が空のまま登録するとバリデーションエラーが表示される', async ({ page, request }) => {
  // ログインしてトークン取得
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  // テスト用テーマをAPIで事前作成（テーマ一覧が表示されるために最低1件必要）
  const createRes = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'E2E-THEMES-010-事前テーマ', description: 'E2E-THEMES-010 自動テスト用' },
  });
  const createdTheme = await createRes.json();
  const themeId: string = createdTheme.id;

  try {
    // ブラウザでログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット（ボタンクリック前）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-010-before.png', fullPage: true });

    // 追加前のカード数を記録
    const cardsBefore = await page.locator('.MuiCard-root').count();

    // 「テーマを追加」ボタンをクリック
    const addButton = page.locator('button.MuiButton-contained', { hasText: 'テーマを追加' });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // ダイアログが表示されるまで待機
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // スクリーンショット（ダイアログ表示後、テーマ名は空のまま）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-010-dialog-empty.png', fullPage: true });

    // テーマ名フィールドが空であることを確認
    const nameField = dialog.getByLabel('テーマ名');
    await expect(nameField).toBeVisible();
    await expect(nameField).toHaveValue('');

    // 追加ボタンをクリック（テーマ名は空のまま）
    const submitButton = dialog.getByRole('button', { name: '追加' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // スクリーンショット（送信後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-010-after-submit.png', fullPage: true });

    // バリデーションエラーメッセージが表示されることを確認
    // ThemesPage.tsx の validate() が "テーマ名を入力してください" を helperText として表示する
    const errorText = dialog.getByText('テーマ名を入力してください');
    await expect(errorText).toBeVisible({ timeout: 5000 });

    // ダイアログがまだ開いていること（閉じられていないこと）
    await expect(dialog).toBeVisible();

    // スクリーンショット（エラー表示確認後）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-010-error-shown.png', fullPage: true });

    // テーマが登録されていないこと（カード数が変わっていないこと）
    // まずダイアログを閉じる
    const cancelButton = dialog.getByRole('button', { name: 'キャンセル' });
    await cancelButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    const cardsAfter = await page.locator('.MuiCard-root').count();
    expect(cardsAfter).toBe(cardsBefore);

    // スクリーンショット（最終確認）
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-010-verified.png', fullPage: true });
  } finally {
    // クリーンアップ: テーマを削除
    await request.delete(`http://localhost:8000/api/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test('E2E-THEMES-002: ログイン済みでテーマ一覧がカード表示される', async ({ page, request }) => {
  // テスト用テーマをAPIで事前作成
  const loginRes = await request.post('http://localhost:8000/api/auth/login', {
    data: { email: 'demo@example.com', password: 'demo123' },
  });
  const { token } = await loginRes.json();

  const createRes = await request.post('http://localhost:8000/api/themes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'E2Eテスト用テーマ', description: 'E2E-THEMES-002 自動テスト用' },
  });
  const createdTheme = await createRes.json();
  const themeId: string = createdTheme.id;

  try {
    // ログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');

    // ダッシュボードへのリダイレクトを確認
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // /themes へ移動
    await page.goto('/themes');
    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 });

    // ローディングスピナーが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 15000 }).catch(() => {});

    // スクリーンショット保存
    await page.screenshot({ path: '/tmp/bluelamp-screenshots/e2e-themes-002.png', fullPage: true });

    // 登録済みテーマがカード形式で表示されることを確認
    const cards = page.locator('.MuiCard-root');
    const count = await cards.count();

    // テーマが1件以上表示されていること
    expect(count).toBeGreaterThanOrEqual(1);

    // 各カードにテーマ名（h6見出し）が表示されていること
    const firstCard = cards.first();
    await expect(firstCard.locator('h6')).toBeVisible();
  } finally {
    // テスト後にテーマを削除してクリーンアップ
    await request.delete(`http://localhost:8000/api/themes/${themeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});
