// Temporary, version- and source-pinned mitigations. npm advisories remain visible.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const patches = [
  {
    name: 'node-forge', version: '1.4.0', file: 'node-forge/lib/rsa.js',
    sha256: 'fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50',
    before: '            obj.value.length !== 2) {', count: 1,
    after: `            obj.value.length !== 2 ||
            // NextFit: validate the nested AlgorithmIdentifier element count too.
            obj.value[0].value.length !== ('parameters' in capture ? 2 : 1) ||
            ('parameters' in capture && capture.parameters !== '')) {`,
  },
];

function apply({ check = false } = {}) {
  const lock = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package-lock.json'), 'utf8'));
  for (const p of patches) {
    const copies = Object.keys(lock.packages).filter(location =>
      location === `node_modules/${p.name}` || location.endsWith(`/node_modules/${p.name}`));
    if (copies.length !== 1 || copies[0] !== `node_modules/${p.name}`) {
      throw new Error(`Review installed copies of ${p.name} before applying mitigation`);
    }
  }
  // Validate every target before modifying any; unknown versions/source fail closed.
  const changes = patches.map(p => {
    const manifest = require(`${p.name}/package.json`);
    if (manifest.version !== p.version) throw new Error(`Review security mitigation for ${p.name}@${manifest.version}`);
    const filename = require.resolve(p.file);
    const source = fs.readFileSync(filename, 'utf8');
    const alreadyPatched = source.split(p.after).length - 1 === p.count;
    const original = alreadyPatched ? source.split(p.after).join(p.before) : source;
    const hash = crypto.createHash('sha256').update(original).digest('hex');
    if (hash !== p.sha256 || original.split(p.before).length - 1 !== p.count) {
      throw new Error(`Unexpected ${p.file}; review mitigation instead of applying blindly`);
    }
    if (check && !alreadyPatched) throw new Error(`Missing security mitigation for ${p.name}; run npm run postinstall`);
    return { filename, name: p.name, source: original.split(p.before).join(p.after), alreadyPatched };
  });
  for (const change of changes) {
    if (!check && !change.alreadyPatched) fs.writeFileSync(change.filename, change.source);
    console.log(`PASS tooling mitigation ${check ? 'verified' : 'installed'}: ${change.name}`);
  }
}

if (require.main === module) apply({ check: process.argv.includes('--check') });
module.exports = { apply };
