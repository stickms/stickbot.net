const { readFileSync } = require('fs');
const { resolve } = require('path');

function loadEnv(filePath) {
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv(resolve(__dirname, '.env'));

module.exports = {
  apps: [
    {
      name: 'stickbot-web',
      script: '.output/server/index.mjs',
      cwd: __dirname,
      restart_delay: 3000,
      max_restarts: 5,
      env,
    },
    {
      name: 'stickbot-socket',
      script: 'dist/socket-server.js',
      cwd: __dirname,
      restart_delay: 3000,
      max_restarts: 5,
      env,
    },
  ],
};
