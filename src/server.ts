import Fastify from 'fastify';
import cors from '@fastify/cors';
import { InMemoryNotificationRepository } from './repository.js';
import { FakeSmsProvider, FakePushProvider } from './ports.js';
import { NotificationService } from './service.js';
import { registerNotificationRoutes } from './routes.js';

async function start() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  // ── Dependency wiring ─────────────────────────────────────────────────────
  const notifRepo = new InMemoryNotificationRepository(); // → PostgresNotificationRepository
  const smsPort   = new FakeSmsProvider();               // → TwilioSmsProvider
  const pushPort  = new FakePushProvider();              // → FirebasePushProvider

  const service = new NotificationService(notifRepo, smsPort, pushPort);
  registerNotificationRoutes(app, service);

  app.get('/health', async () => ({ status: 'ok', service: 'notification-svc' }));

  const PORT = 3007;
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`notification-svc running on http://localhost:${PORT}`);
}

start().catch((err) => { console.error(err); process.exit(1); });
