# notification-svc Implementation Guide

## Overview
Delivers and stores notifications across SMS, push, and in-app channels for HarvestConnect. Receives fire-and-forget calls from order-svc, payment-svc, logistics-svc, and auth-svc. Runs on **port 3007**.

---

## Stack
| Item | Version |
|------|---------|
| Fastify | ^5.8.5 |
| Zod | ^4.4.3 |
| TypeScript | ^6.0.3 |

---

## Architecture

```
routes.ts  →  service.ts  →  repository.ts (InMemoryNotificationRepository)
                          →  ports.ts (SmsPort | PushPort)
```

notification-svc has **no upstream service dependencies** — it only receives.

---

## Key Design Decisions

### Channel Fan-Out
`send()` in `service.ts` fans out based on the requested channel:
- `sms` + `phone` provided → call `SmsPort.send(phone, message)`
- `push` + `userId` provided → call `PushPort.send(userId, title, body)`
- Always: store an `in_app` record in the repository

### Event Templates
`TEMPLATES` map in `service.ts` covers 11 standard events. Each template is a `(data: Record<string, string>) => { title, body }` function. Callers pass `event` + `data` (key-value substitution). Example:

```ts
TEMPLATES['order_placed']({ orderId: 'order-001', total: '₹545' })
// → { title: 'Order placed!', body: 'Your order order-001 for ₹545 has been placed.' }
```

### Validation
`sendNotificationSchema` uses a Zod `.refine()` to require at least one of `userId` or `phone`. A notification with neither is rejected with `400`.

### In-App Storage
All notifications (regardless of channel) create a `Notification` record with `read: false`. Users can list, mark-read, and delete their in-app notifications.

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/notifications/send` | Send notification (202 Accepted) |
| GET | `/v1/notifications?userId=` | List in-app notifications for user |
| PATCH | `/v1/notifications/:id/read` | Mark notification as read |
| DELETE | `/v1/notifications/:id` | Delete notification (204) |

---

## Notification Events

| Event | Triggered By |
|-------|-------------|
| `order_placed` | order-svc |
| `order_confirmed` | order-svc |
| `order_dispatched` | order-svc |
| `order_delivered` | order-svc / logistics-svc |
| `order_cancelled` | order-svc |
| `payment_success` | payment-svc |
| `payment_failed` | payment-svc |
| `refund_initiated` | payment-svc |
| `otp_sent` | auth-svc |
| `seller_verified` | admin-svc |
| `product_approved` | admin-svc |

---

## Environment Variables

| Var | Default | Effect |
|-----|---------|--------|
| `PORT` | `3007` | Listening port |

No upstream service URLs needed — notification-svc only receives.

---

## Files & Responsibilities

| File | Responsibility |
|------|----------------|
| `src/types.ts` | `NotificationChannel`, `NotificationEvent`, `Notification` |
| `src/schemas.ts` | `sendNotificationSchema` with refine for userId/phone |
| `src/errors.ts` | `AppError` hierarchy |
| `src/ports.ts` | `SmsPort` + `FakeSmsProvider`; `PushPort` + `FakePushProvider` |
| `src/repository.ts` | `InMemoryNotificationRepository` (create, findByUserId, markRead, delete) |
| `src/service.ts` | `NotificationService` — TEMPLATES map, fan-out logic |
| `src/routes.ts` | Route registration + `handleError` |
| `src/server.ts` | Dependency wiring, port 3007 |

---

## Changes Required When Real Services Are Available

### DB Available
| File | Change |
|------|--------|
| `src/repository.ts` | Swap `InMemoryNotificationRepository` for Postgres |
| `src/server.ts` | Inject real repository |

### SMS Provider Available (Twilio / MSG91)
| File | Change |
|------|--------|
| `src/ports.ts` | Add `Msg91SmsProvider` (or Twilio) implementing `SmsPort` |
| `src/server.ts` | Wire `MSG91_API_KEY` + `MSG91_SENDER_ID` env vars → real provider |

### Push Notification Available (FCM)
| File | Change |
|------|--------|
| `src/ports.ts` | Add `FcmPushProvider` implementing `PushPort` (POST to FCM v1 API) |
| `src/server.ts` | Wire `FCM_SERVER_KEY` env var → `FcmPushProvider` |
| _(optional)_ | Add device token lookup: store userId→FCM token mapping |
