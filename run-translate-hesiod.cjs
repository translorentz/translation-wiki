const { spawn } = require('child_process');
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

console.log('Starting translation of hesiod-theogony-exegesis chapters 1-109...');
console.log('DEEPSEEK_API_KEY set:', env.DEEPSEEK_API_KEY ? 'yes' : 'no');

const child = spawn('npx', ['tsx', 'scripts/translate-batch.ts', '--text', 'hesiod-theogony-exegesis', '--start', '1', '--end', '109', '--delay', '500'], {
  env: { ...process.env, ...env },
  cwd: __dirname,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  console.log('Translation process exited with code:', code);
  process.exit(code || 0);
});
