export type NotificationChannel = 'sms' | 'push' | 'in_app';

export type NotificationEvent =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_processing'
  | 'order_dispatched'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_success'
  | 'payment_failed'
  | 'otp_request'
  | 'member_invited'
  | 'member_activated';

export interface Notification {
  id:        string;
  userId?:   string;   // recipient userId — optional if phone provided
  phone?:    string;   // for SMS-only notifications (e.g. OTP to unregistered)
  event:     NotificationEvent;
  channel:   NotificationChannel;
  title:     string;
  body:      string;
  data?:     Record<string, string>;  // deep-link data (orderId, sellerId etc.)
  read:      boolean;
  delivered: boolean;
  createdAt: string;
}
