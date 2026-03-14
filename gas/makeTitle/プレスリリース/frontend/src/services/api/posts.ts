import { apiFetch } from './client';

export interface PostQueueItem {
  id: string;
  themeId: string | null;
  themeName: string | null;
  content: string;
  status: 'draft' | 'approved' | 'posted' | 'failed' | 'cancelled';
  scheduledAt: string | null;
  postedAt: string | null;
  threadsPostId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchPosts(statuses: string[]): Promise<PostQueueItem[]> {
  return apiFetch<PostQueueItem[]>(`/api/posts?post_status=${statuses.join(',')}`);
}

export async function generateDraft(themeId: string): Promise<PostQueueItem> {
  return apiFetch<PostQueueItem>('/api/posts/generate', {
    method: 'POST',
    body: JSON.stringify({ themeId }),
  });
}

export async function createDraft(content: string, themeId?: string, themeName?: string): Promise<PostQueueItem> {
  return apiFetch<PostQueueItem>('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ content, themeId, themeName }),
  });
}

export async function editPost(postId: string, content: string): Promise<PostQueueItem> {
  return apiFetch<PostQueueItem>(`/api/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export async function approvePost(postId: string, scheduledAt: string): Promise<PostQueueItem> {
  return apiFetch<PostQueueItem>(`/api/posts/${postId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt }),
  });
}

export async function cancelPost(postId: string): Promise<void> {
  return apiFetch<void>(`/api/posts/${postId}`, { method: 'DELETE' });
}
