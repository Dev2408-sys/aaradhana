import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './utils/logger';

async function bootstrap() {
  await prisma.$connect();
  logger.info('Database connected');

  const app = createApp();
  // Production: bind localhost only — nginx proxies public traffic
  const host = env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
  app.listen(env.PORT, host, () => {
    logger.info(`Kesariya API listening on http://${host}:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
