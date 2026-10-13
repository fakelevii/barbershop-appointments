const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const http = require('node:http');
const { createRequire } = require('node:module');
const { buildSync } = require('esbuild');

function compileEntry() {
  return buildSync({
    absWorkingDir: path.resolve(__dirname, '..'),
    entryPoints: ['app.js'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    write: false,
    metafile: true
  });
}

test('compiled app serves requests without depending on uncompiled source files', async t => {
  const compiled = compileEntry();
  const module = { exports: {} };
  const filename = path.join(os.tmpdir(), 'barbershop-compiled-entry.cjs');
  const compiledRequire = createRequire(filename);
  const load = vm.runInThisContext(
    `(function(module, exports, require) {\n${compiled.outputFiles[0].text}\n})`,
    { filename }
  );
  load(module, module.exports, name => name.startsWith('.') ? compiledRequire(name) : require(name));
  assert.equal(typeof module.exports, 'function');

  const oldNodeEnv = process.env.NODE_ENV;
  t.after(() => {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
  });
  process.env.NODE_ENV = 'development';
  const server = http.createServer(module.exports).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    message: 'API unavailable. Check the deployment environment and database access.'
  });
});

test('deployment entry dependency graph has no circular imports', () => {
  const { inputs } = compileEntry().metafile;
  const visited = new Set();
  function visit(filename, ancestors = []) {
    assert.ok(!ancestors.includes(filename), `Circular import: ${[...ancestors, filename].join(' -> ')}`);
    if (visited.has(filename)) return;
    for (const dependency of inputs[filename]?.imports || []) {
      if (!dependency.external) visit(dependency.path, [...ancestors, filename]);
    }
    visited.add(filename);
  }
  visit('app.js');
});
