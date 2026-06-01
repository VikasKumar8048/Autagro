'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { notificationsApi } from '@/lib/notifications-api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: count } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.unreadCount(accessToken!),
    enabled: Boolean(accessToken),
    refetchInterval: 30_000,
  });

  const { data: items } = useQuery({
    queryKey: ['notifications', open],
    queryFn: () => notificationsApi.list(accessToken!, false),
    enabled: Boolean(accessToken) && open,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!accessToken) return null;

  const unread = count?.count ?? 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold text-slate-900">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  className="text-xs text-emerald-700 hover:underline"
                  onClick={() => markAll.mutate()}
                >
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {!items?.length ? (
                <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications</li>
              ) : (
                items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'border-b px-4 py-3 text-sm last:border-0',
                      !n.read && 'bg-emerald-50/50',
                    )}
                  >
                    <p className="font-medium text-slate-900">{n.title}</p>
                    <p className="mt-0.5 text-slate-600">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
