const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'auth-audit.log');

const ensureLogFile = async () => {
  await fs.promises.mkdir(LOG_DIR, { recursive: true });
  try {
    await fs.promises.access(LOG_FILE, fs.constants.F_OK);
  } catch {
    await fs.promises.writeFile(LOG_FILE, '', 'utf8');
  }
};

const writeAuthAuditLog = async ({
  action,
  status,
  userId = null,
  email = null,
  ip = null,
  userAgent = null,
  metadata = {}
}) => {
  try {
    await ensureLogFile();

    const entry = {
      timestamp: new Date().toISOString(),
      action,
      status,
      userId,
      email,
      ip,
      userAgent,
      metadata
    };

    await fs.promises.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (error) {
    console.error('Auth audit log write failed:', error);
  }
};

module.exports = {
  writeAuthAuditLog
};
