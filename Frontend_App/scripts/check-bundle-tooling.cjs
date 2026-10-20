// Inspect the generated source maps; never infer absence from package.json alone.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.argv[2];
assert.ok(root, 'Pass the Expo export directory generated with --source-maps.');
const flagged = /(?:^|\/)(?:node_modules\/)?(?:braces|node-forge|sprintf-js)(?:\/|$)/;
function sources(map) {
  return [...(map.sources || []), ...(map.sections || []).flatMap(section => sources(section.map))];
}
for (const platform of ['android', 'ios']) {
  const directory = path.join(root, '_expo/static/js', platform);
  const maps = fs.readdirSync(directory).filter(name => name.endsWith('.map'));
  assert.ok(maps.length, `No ${platform} source map found.`);
  let count = 0;
  for (const filename of maps) {
    const entries = sources(JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8')));
    assert.ok(entries.length > 100, `Unexpectedly empty ${platform} source map.`);
    const found = entries.filter(entry => flagged.test(entry.replaceAll('\\', '/')));
    assert.deepEqual(found, [], `Flagged build-tool package found in ${platform} bundle.`);
    count += entries.length;
  }
  console.log(`PASS ${platform}: ${count} mapped sources; no braces, node-forge or sprintf-js included.`);
}
