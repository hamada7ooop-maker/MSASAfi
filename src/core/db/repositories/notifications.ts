import { db } from '../core';
import type { AppNotification } from '@/types';
import { triggerNotificationRefresh } from '@/core/events';
import { sendTelegramMessage } from '../../telegram';
import { t } from '../../../i18n/engine';
import { silentFail, ignore } from '@/core/utils';

export const NotificationRepository = {
  async getAll(): Promise<AppNotification[]> {
    return await db.notifications.orderBy('date').reverse().toArray();
  },

  async getUnreadCount(): Promise<number> {
    return await db.notifications.where('read').equals(0).count();
  },

  async markAsRead(id: string): Promise<void> {
    await db.notifications.update(id, { read: 1 });
    triggerNotificationRefresh().catch(ignore());
  },

  async markAllAsRead(): Promise<void> {
    await db.notifications.where('read').equals(0).modify({ read: 1 });
    triggerNotificationRefresh().catch(ignore());
  },

  async add(n: Omit<AppNotification, 'id' | 'read' | 'date'>): Promise<AppNotification> {
    const item: AppNotification = {
      ...n,
      id: Date.now().toString(36),
      read: 0,
      date: new Date().toISOString()
    };
    await db.notifications.put(item);
    
    // Dispatch to Telegram Bot asynchronously
    try {
      const title = t(item.title) || item.title;
      const rawMsg = item.message ?? item.body ?? '';
      const message = rawMsg ? (t(rawMsg) || rawMsg) : '';
      const tgMsg = `🔔 *إشعار مالي جديد | New Notification*\n\n🔹 *${title}*\n📝 ${message}`;
      sendTelegramMessage(tgMsg).catch(silentFail('TelegramDispatch'));
    } catch (e) {
      silentFail('TelegramDispatch')(e);
    }

    triggerNotificationRefresh().catch(ignore());
    return item;
  },

  async clearAll(): Promise<void> {
    await db.notifications.clear();
    triggerNotificationRefresh().catch(ignore());
  }
};
