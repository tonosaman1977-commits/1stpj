// @API_INTEGRATION: バックエンドAPI実装後にAgent 8で接続
import type { PostTheme } from '../../types';

export async function fetchThemes(): Promise<PostTheme[]> {
  throw new Error('API not implemented');
}

export async function createTheme(data: { name: string; description: string }): Promise<PostTheme> {
  throw new Error('API not implemented');
}

export async function updateTheme(id: string, data: { name: string; description: string }): Promise<PostTheme> {
  throw new Error('API not implemented');
}

export async function deleteTheme(id: string): Promise<void> {
  throw new Error('API not implemented');
}

export async function activateTheme(id: string): Promise<PostTheme> {
  throw new Error('API not implemented');
}
