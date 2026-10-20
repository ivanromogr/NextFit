const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {inspect, auditOrigins} = require('./check-bundle-tooling.cjs');
const report = name => ({metadata: {vulnerabilities: {total: 2}}, vulnerabilities: {
  [name]: {via: [{title: 'Fixture advisory'}]}, consumer: {via: [name]},
}});
function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nextfit-bundle-'));
  const write = (platform, extra = [], indexed = false) => {
    const dir = path.join(root, '_expo/static/js', platform);
    fs.mkdirSync(dir, {recursive: true});
    const map = {sources: [...Array.from({length: 101}, (_, i) => `app/safe${i}.js`), ...extra]};
    fs.writeFileSync(path.join(dir, 'bundle.map'), JSON.stringify(indexed ? {sections: [{map}]} : map));
  };
  try { write('android'); write('ios'); run(root, write); }
  finally { fs.rmSync(root, {recursive: true, force: true}); }
}
test('derives direct advisory origins without counting propagated consumers', () => {
  assert.deepEqual(auditOrigins(report('new-package')), ['new-package']);
});
test('accepts both complete maps without advisory packages', () => fixture(root => {
  assert.equal(inspect(root, report('new-package')).results.length, 2);
}));
test('rejects a newly flagged package absent from the former fixed list', () => fixture((root, write) => {
  write('android', ['../../node_modules/new-package/index.js']);
  assert.throws(() => inspect(root, report('new-package')), /direct advisory/);
}));
test('detects scoped packages, Windows paths and indexed maps on iOS', () => fixture((root, write) => {
  write('ios', ['..\\node_modules\\@fixture\\unsafe\\index.js'], true);
  assert.throws(() => inspect(root, report('@fixture/unsafe')), /ios bundle/);
}));
test('fails closed for incomplete audit reports and missing platform maps', () => fixture(root => {
  assert.throws(() => inspect(root, {error: {message: 'network'}}), /complete npm audit/);
  assert.throws(() => auditOrigins({metadata: {vulnerabilities: {total: 1}}, vulnerabilities: {}}), /no advisory origins/);
  fs.rmSync(path.join(root, '_expo/static/js/ios/bundle.map'));
  assert.throws(() => inspect(root, report('new-package')), /No ios source map/);
}));
test('accepts an explicitly clean audit and rejects unexpectedly empty maps', () => fixture((root, write) => {
  assert.deepEqual(inspect(root, {metadata: {vulnerabilities: {total: 0}}, vulnerabilities: {}}).origins, []);
  write('ios');
  fs.writeFileSync(path.join(root, '_expo/static/js/ios/bundle.map'), '{"sources":[]}');
  assert.throws(() => inspect(root, report('new-package')), /empty ios source map/);
}));
