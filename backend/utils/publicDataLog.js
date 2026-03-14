const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'public-data.log');

const ensureLogFile = async () => {
  await fs.promises.mkdir(LOG_DIR, { recursive: true });
  try {
    await fs.promises.access(LOG_FILE, fs.constants.F_OK);
  } catch {
    await fs.promises.writeFile(LOG_FILE, '', 'utf8');
  }
};

const writePublicDataLog = async ({
  source,
  status,
  pathName = null,
  query = null,
  ip = null,
  metadata = {}
}) => {
  try {
    await ensureLogFile();

    const entry = {
      timestamp: new Date().toISOString(),
      source,
      status,
      path: pathName,
      query,
      ip,
      metadata
    };

    await fs.promises.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (error) {
    console.error('Public-data log write failed:', error);
  }
};

module.exports = {
  writePublicDataLog
};
