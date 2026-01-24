const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  if (line.startsWith('#') || line.trim() === '') continue;
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) continue;
  const key = line.substring(0, eqIdx);
  let val = line.substring(eqIdx + 1).replace(/^'|'$/g, '');
  if (key === 'DATABASE_URL' && val.includes('neon')) {
    env[key] = val;
  } else if (key !== 'DATABASE_URL') {
    env[key] = val;
  }
}
console.log('Running seed-db.ts with Neon DATABASE_URL...');
console.log('DATABASE_URL starts with:', env.DATABASE_URL ? env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET');
try {
  const result = execSync('npx tsx scripts/seed-db.ts', {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 180000,
    cwd: __dirname,
    stdio: 'inherit'
  });
} catch(e) {
  if (e.status) {
    process.exit(e.status);
  }
}
