import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

function load(backend) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', "import('./vercel.mjs').then(m=>console.log(JSON.stringify(m.config)))"], {
    cwd: process.cwd(), env: { ...process.env, BACKEND_ORIGIN: backend }, encoding: 'utf8'
  });
}
it('routes API calls to the configured HTTPS backend before SPA fallback', () => {
  const result = load('https://barbershop-api.example/');
  expect(result.status, result.stderr).toBe(0);
  const { rewrites } = JSON.parse(result.stdout);
  expect(rewrites[0]).toEqual({ source: '/api/:path*', destination: 'https://barbershop-api.example/api/:path*' });
  expect(rewrites[1]).toEqual({ source: '/((?!api(?:/|$)).*)', destination: '/index.html' });
});
it.each(['', 'http://example.com', 'https://user:password@example.com', 'https://example.com/api', 'https://example.com/?key=value'])('rejects invalid backend configuration %s', backend => {
  const result = load(backend);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('BACKEND_ORIGIN');
});
