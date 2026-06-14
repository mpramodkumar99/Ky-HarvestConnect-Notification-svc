import { randomUUID } from 'node:crypto';
import type { Notification } from './types.js';

export interface NotificationRepository {
  create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string): Promise<Notification[]>;
  markRead(id: string): Promise<Notification | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private store = new Map<string, Notification>();

  async create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notification: Notification = {
      ...data,
      id:        randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
    return notification;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.store.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    return [...this.store.values()]
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markRead(id: string): Promise<Notification | null> {
    const n = this.store.get(id);
    if (!n) return null;
    const updated: Notification = { ...n, read: true };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
