const app = require('./app');
const env = require('./config/env');
const { pool } = require('./db/pool');

const server = app.listen(env.port, () => {
  console.log(`Smart Placement API listening on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
