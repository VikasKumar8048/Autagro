import { apiRequest } from './api-client';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (token: string, unreadOnly = false) =>
    apiRequest<NotificationItem[]>(
      `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`,
      { accessToken: token },
    ),

  unreadCount: (token: string) =>
    apiRequest<{ count: number }>('/notifications/unread-count', {
      accessToken: token,
    }),

  markRead: (token: string, id: string) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'PATCH',
      accessToken: token,
    }),

  markAllRead: (token: string) =>
    apiRequest('/notifications/read-all', {
      method: 'PATCH',
      accessToken: token,
    }),
};
