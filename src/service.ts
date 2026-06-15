import type { NotificationRepository } from './repository.js';
import type { SmsPort, PushPort } from './ports.js';
import type { NotificationEvent, NotificationChannel, Notification } from './types.js';
import { NotFoundError } from './errors.js';

// Message templates — one per event
const TEMPLATES: Record<NotificationEvent, { title: string; body: (d: Record<string, string>) => string }> = {
  order_placed:      { title: 'Order Placed',       body: d => `Your order #${d['orderId'] ?? ''} has been placed successfully.` },
  order_confirmed:   { title: 'Order Confirmed',    body: d => `${d['sellerName'] ?? 'Your seller'} confirmed your order.` },
  order_processing:  { title: 'Order Processing',   body: d => `${d['sellerName'] ?? 'Your seller'} is preparing your order.` },
  order_dispatched:  { title: 'Order Dispatched',   body: d => `Your order is on its way! Tracking: ${d['trackingId'] ?? ''}` },
  order_delivered:   { title: 'Delivered!',         body: d => `Order #${d['orderId'] ?? ''} was delivered. Tap to rate.` },
  order_cancelled:   { title: 'Order Cancelled',    body: d => `Order #${d['orderId'] ?? ''} was cancelled. ${d['reason'] ?? ''}` },
  payment_success:   { title: 'Payment Success',    body: d => `₹${d['amount'] ?? ''} paid for order #${d['orderId'] ?? ''}.` },
  payment_failed:    { title: 'Payment Failed',     body: d => `Payment for order #${d['orderId'] ?? ''} failed. Retry or choose COD.` },
  otp_request:       { title: 'HarvestConnect OTP', body: d => `Your OTP is ${d['code'] ?? ''}. Valid for 10 minutes. Do not share.` },
  member_invited:    { title: 'Team Invite',        body: d => `${d['sellerName'] ?? ''} invited you as ${d['role'] ?? ''}.` },
  member_activated:  { title: 'Team Member Joined', body: d => `${d['memberName'] ?? ''} joined your team at ${d['sellerName'] ?? ''}.` },
};

export class NotificationService {
  constructor(
    private repo:      NotificationRepository,
    private smsPort:   SmsPort,
    private pushPort:  PushPort,
  ) {}

  async send(
    event:   NotificationEvent,
    channel: NotificationChannel,
    data:    Record<string, string>,
    userId?: string,
    phone?:  string,
  ): Promise<Notification> {
    const template = TEMPLATES[event];
    const title    = template.title;
    const body     = template.body(data);

    // Dispatch to the correct delivery channel
    if (channel === 'sms' && phone) {
      await this.smsPort.send(phone, body).catch(err => console.error('[SMS error]', err));
    } else if (channel === 'push' && userId) {
      await this.pushPort.send(userId, title, body, data).catch(err => console.error('[PUSH error]', err));
    }

    // Always store in_app record for in-app notification bell
    return this.repo.create({
      userId, phone, event, channel, title, body, data,
      read: false, delivered: true,
    });
  }

  async listForUser(userId: string): Promise<Notification[]> {
    return this.repo.findByUserId(userId);
  }

  async markRead(id: string): Promise<Notification> {
    const n = await this.repo.markRead(id);
    if (!n) throw new NotFoundError(`Notification ${id} not found`);
    return n;
  }

  async deleteNotification(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError(`Notification ${id} not found`);
  }
}
