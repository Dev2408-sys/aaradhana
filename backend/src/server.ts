import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './utils/logger';

async function bootstrap() {
  await prisma.$connect();
  logger.info('Database connected');

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Kesariya API listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
