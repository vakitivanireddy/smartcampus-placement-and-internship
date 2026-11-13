/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

const ALLOWED_DB_NAME = /^[A-Za-z0-9_]+$/;

async function setup() {
  if (!ALLOWED_DB_NAME.test(env.db.database)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores.');
  }

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${env.db.database}\``);
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schema);
    console.log(`Schema applied to database "${env.db.database}".`);
  } finally {
    await connection.end();
  }

  const { seed } = require('./seed');
  const { pool } = require('./pool');
  try {
    await seed();
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setup().catch((error) => {
    console.error('Database setup failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Check DB_USER / DB_PASSWORD in backend/.env and that the database user has CREATE privileges.');
    }
    process.exit(1);
  });
}

module.exports = { setup };
