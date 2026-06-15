import { z } from 'zod';

export const sendNotificationSchema = z.object({
  userId:  z.string().optional(),
  phone:   z.string().optional(),
  event:   z.enum([
    'order_placed','order_confirmed','order_processing','order_dispatched',
    'order_delivered','order_cancelled','payment_success','payment_failed',
    'otp_request','member_invited','member_activated',
  ]),
  channel: z.enum(['sms','push','in_app']).default('in_app'),
  data:    z.record(z.string(), z.string()).optional(),
}).refine(d => d.userId || d.phone, { message: 'userId or phone is required' });
