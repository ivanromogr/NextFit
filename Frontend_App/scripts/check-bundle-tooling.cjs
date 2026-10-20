// Inspect generated maps against a saved npm audit report, never a fixed allowlist.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
function sources(map) {
  return [...(map.sources || []), ...(map.sections || []).flatMap(section => sources(section.map))];
}
function auditOrigins(audit) {
  assert.ok(!audit.error && audit.metadata?.vulnerabilities && audit.vulnerabilities,
    'A complete npm audit --json report is required.');
  const origins = Object.entries(audit.vulnerabilities)
    .filter(([, item]) => Array.isArray(item.via) && item.via.some(via => via && typeof via === 'object'))
    .map(([name]) => name);
  assert.ok(origins.length || audit.metadata.vulnerabilities.total === 0,
    'Audit reports vulnerabilities but no advisory origins.');
  return origins;
}
function inspect(root, audit) {
  const origins = auditOrigins(audit);
  const results = [];
  for (const platform of ['android', 'ios']) {
    const directory = path.join(root, '_expo/static/js', platform);
    const maps = fs.readdirSync(directory).filter(name => name.endsWith('.map'));
    assert.ok(maps.length, `No ${platform} source map found.`);
    let count = 0;
    for (const filename of maps) {
      const entries = sources(JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8')));
      assert.ok(entries.length > 100, `Unexpectedly empty ${platform} source map.`);
      const found = entries.filter(entry => {
        const normalized = '/' + entry.replaceAll('\\', '/');
        return origins.some(name => normalized.includes(`/node_modules/${name}/`)
          || normalized.startsWith(`/${name}/`));
      });
      assert.deepEqual(found, [], `Package with a direct advisory found in ${platform} bundle.`);
      count += entries.length;
    }
    results.push({platform, count});
  }
  return {origins, results};
}
if (require.main === module) {
  const [root, auditPath] = process.argv.slice(2);
  assert.ok(root && auditPath, 'Pass the Expo export directory and npm audit JSON file.');
  const {origins, results} = inspect(root, JSON.parse(fs.readFileSync(auditPath, 'utf8')));
  for (const {platform, count} of results) {
    console.log(`PASS ${platform}: ${count} mapped sources; none of ${origins.length} advisory-origin packages included.`);
  }
  console.log('Artifact check only: npm audit findings and native/toolchain exposure remain open.');
}
module.exports = {inspect, auditOrigins};
