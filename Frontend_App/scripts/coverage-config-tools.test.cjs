// Exercise the real Istanbul config consumer after its scoped YAML update.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');

test('Istanbul reads YAML coverage options and inherited configuration', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'nextfit-coverage-'));
  try {
    await fs.writeFile(path.join(cwd, 'package.json'), '{"private":true}');
    await fs.writeFile(path.join(cwd, 'base.yaml'), 'all: true\nexclude:\n  - "**/fixtures/**"\n');
    await fs.writeFile(path.join(cwd, '.nycrc.yaml'),
      'extends: ./base.yaml\ncheck-coverage: true\nlines: 80\ninclude:\n  - "src/**/*.js"\nreporter:\n  - text\n  - lcov\n');
    const config = await loadNycConfig({ cwd });
    assert.equal(config.all, true);
    assert.equal(config.checkCoverage, true);
    assert.equal(config.lines, 80);
    assert.deepEqual(config.include, ['src/**/*.js']);
    assert.deepEqual(config.exclude, ['**/fixtures/**']);
    assert.deepEqual(config.reporter, ['text', 'lcov']);
    assert.equal(config.cwd, cwd);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('Istanbul rejects duplicate YAML keys instead of silently replacing options', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'nextfit-coverage-'));
  try {
    await fs.writeFile(path.join(cwd, 'package.json'), '{"private":true}');
    await fs.writeFile(path.join(cwd, '.nycrc.yaml'), 'lines: 80\nlines: 0\n');
    await assert.rejects(loadNycConfig({ cwd }), /duplicated mapping key/);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
