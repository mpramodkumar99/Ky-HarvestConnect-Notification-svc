import type { FastifyInstance, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import type { NotificationService } from './service.js';
import { sendNotificationSchema } from './schemas.js';
import { AppError } from './errors.js';
import type { NotificationEvent, NotificationChannel } from './types.js';

function handleError(err: unknown, reply: FastifyReply) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      success: false,
      error: { type: err.name, title: err.message, status: err.statusCode },
    });
  }
  if (err instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: { type: 'validation_error', title: 'Validation error', status: 400, detail: err.flatten().fieldErrors },
    });
  }
  console.error(err);
  return reply.status(500).send({ success: false, error: { type: 'internal_error', title: 'Internal server error', status: 500 } });
}

export function registerNotificationRoutes(app: FastifyInstance, service: NotificationService) {

  // POST /v1/notifications/send  — called by all other services
  app.post('/v1/notifications/send', async (request, reply) => {
    try {
      const body = sendNotificationSchema.parse(request.body);
      const notification = await service.send(
        body.event as NotificationEvent,
        body.channel as NotificationChannel,
        body.data ?? {},
        body.userId,
        body.phone,
      );
      return reply.status(202).send({ success: true, data: notification });
    } catch (err) { return handleError(err, reply); }
  });

  // GET /v1/notifications?userId=
  app.get('/v1/notifications', async (request, reply) => {
    try {
      const { userId } = request.query as { userId?: string };
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: { type: 'BadRequestError', title: 'userId query param required', status: 400 },
        });
      }
      const notifications = await service.listForUser(userId);
      return reply.send({ success: true, data: notifications, meta: { total: notifications.length } });
    } catch (err) { return handleError(err, reply); }
  });

  // PATCH /v1/notifications/:id/read
  app.patch('/v1/notifications/:id/read', async (request, reply) => {
    try {
      const { id }  = request.params as { id: string };
      const updated = await service.markRead(id);
      return reply.send({ success: true, data: updated });
    } catch (err) { return handleError(err, reply); }
  });

  // DELETE /v1/notifications/:id
  app.delete('/v1/notifications/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await service.deleteNotification(id);
      return reply.status(204).send();
    } catch (err) { return handleError(err, reply); }
  });
}
