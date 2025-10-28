const { spawnSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  console.log('Resetting test database (global-setup)...');

  const envFile = path.resolve(__dirname, '../../.env.test');

  const result = spawnSync('npx', ['prisma', 'migrate', 'reset', '--force'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: require('dotenv').config({ path: envFile }).parsed?.DATABASE_URL },
  });

  if (result.status !== 0) {
    throw new Error('Prisma migrate reset failed');
  }

  console.log('Seeding test database (global-setup)...');
  const seedResult = spawnSync('npx', ['ts-node', 'prisma/seed.ts'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: require('dotenv').config({ path: envFile }).parsed?.DATABASE_URL },
  });

  if (seedResult.status !== 0) {
    throw new Error('Prisma db seed failed');
  }
};
