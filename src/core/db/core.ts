import { MasarifiDB } from './schema';
import { applyEncryptionMiddleware } from './encryption';
import { migrateToDexie } from './migrations';
import { logger } from '../logger';

logger.info('DB', 'Initializing modern database layer...');

const db = new MasarifiDB();

try {
  // Apply encryption middleware
  applyEncryptionMiddleware(db);
  logger.info('DB', 'Encryption middleware linked');

  // Trigger legacy migration (only runs once)
  migrateToDexie(db).catch(e => {
    logger.error('DB', 'Migration error', e);
  });

  logger.info('DB', 'Database layer ready');
} catch (e) {
  logger.error('DB', 'CRITICAL ERROR during initialization', e);
  throw e;
}

export { db };
