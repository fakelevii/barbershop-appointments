import process from 'node:process';

let backend;
try {
  backend = new URL(process.env.BACKEND_ORIGIN);
  if (backend.protocol !== 'https:' || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash) throw new Error();
} catch {
  throw new Error('Set BACKEND_ORIGIN to the backend HTTPS origin only, e.g. https://your-api.vercel.app (no /api or credentials).');
}

export const config = {
  framework: 'vite',
  installCommand: 'npm ci',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/api/:path*', destination: backend.origin + '/api/:path*' },
    { source: '/((?!api(?:/|$)).*)', destination: '/index.html' }
  ],
  headers: [{
    source: '/api/:path*',
    headers: [{ key: 'Cache-Control', value: 'private, no-store' }]
  }]
};
