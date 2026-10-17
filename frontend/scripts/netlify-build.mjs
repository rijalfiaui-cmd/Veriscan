import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rawUrl = process.env.RAILWAY_BACKEND_URL?.trim();
let backend;
try {
  backend = new URL(rawUrl);
  if (backend.protocol !== 'https:' || backend.username || backend.password ||
      backend.pathname !== '/' || backend.search || backend.hash) {
    throw new Error('Expected an HTTPS origin');
  }
} catch {
  console.error('Set RAILWAY_BACKEND_URL to your backend HTTPS origin, e.g. https://your-api.up.railway.app (without /api/v1).');
  process.exit(1);
}

const frontendDir = fileURLToPath(new URL('../', import.meta.url));
const build = spawnSync('npm', ['run', 'build'], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: '/api/v1' },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

writeFileSync(new URL('../dist/_redirects', import.meta.url), [
  `/api/* ${backend.origin}/api/:splat 200!`,
  `/uploads/* ${backend.origin}/uploads/:splat 200!`,
  '/* /index.html 200',
  '',
].join('\n'));
