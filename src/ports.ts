// Ports isolate SMS and push providers.
// Swap in server.ts — zero changes to service.ts.

export interface SmsPort {
  send(phone: string, message: string): Promise<void>;
}

export class FakeSmsProvider implements SmsPort {
  async send(phone: string, message: string): Promise<void> {
    console.log(`[SMS] → ${phone}: ${message}`);
  }
}

// Real: TwilioSmsProvider using Twilio Node SDK
// export class TwilioSmsProvider implements SmsPort { ... }

export interface PushPort {
  send(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
}

export class FakePushProvider implements PushPort {
  async send(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    console.log(`[PUSH] → ${userId}: ${title} — ${body}`, data ?? {});
  }
}

// Real: FirebasePushProvider using Firebase Admin SDK (FCM)
// export class FirebasePushProvider implements PushPort { ... }
