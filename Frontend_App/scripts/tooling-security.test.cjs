const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const forge = require('node-forge');
const signing = require('@expo/code-signing-certificates');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('installer is idempotent and refuses changed dependency sources before writing', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nextfit-patch-review-'));
  try {
    fs.mkdirSync(path.join(directory, 'scripts'));
    const installer = path.join(directory, 'scripts/installer.cjs');
    fs.copyFileSync(path.join(__dirname, '../package-lock.json'), path.join(directory, 'package-lock.json'));
    fs.copyFileSync(path.join(__dirname, 'apply-tooling-security-patches.cjs'), installer);
    for (const [name, file] of [['node-forge', 'lib/rsa.js']]) {
      const root = path.join(directory, 'node_modules', name);
      fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
      fs.copyFileSync(require.resolve(`${name}/package.json`), path.join(root, 'package.json'));
      fs.copyFileSync(require.resolve(`${name}/${file}`), path.join(root, file));
    }
    const run = (...args) => spawnSync(process.execPath, [installer, ...args], { encoding: 'utf8', timeout: 5000 });
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
    const forgeFile = path.join(directory, 'node_modules/node-forge/lib/rsa.js');
    fs.appendFileSync(forgeFile, '\n// simulated upstream source change\n');
    const modifiedSource = fs.readFileSync(forgeFile, 'utf8');
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unexpected node-forge\/lib\/rsa.js/);
    assert.equal(fs.readFileSync(forgeFile, 'utf8'), modifiedSource);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const keys = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const privateKey = forge.pki.privateKeyFromPem(keys.privateKey);
const publicKey = forge.pki.publicKeyFromPem(keys.publicKey);
const message = Buffer.from('NextFit local signing regression fixture');
const digest = () => forge.md.sha256.create().update(message.toString());
const a = forge.asn1;
const nullNode = () => a.create(a.Class.UNIVERSAL, a.Type.NULL, false, '');
function signature(parameters) {
  const value = a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
    a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
      a.create(a.Class.UNIVERSAL, a.Type.OID, false, a.oidToDer(forge.oids.sha256).getBytes()),
      ...parameters,
    ]),
    a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, digest().digest().getBytes()),
  ]);
  return privateKey.sign(a.toDer(value).getBytes(), 'NONE');
}

test('PKCS1 verification rejects additional nested AlgorithmIdentifier elements', () => {
  for (const parameters of [
    [nullNode(), nullNode()],
    [a.create(a.Class.UNIVERSAL, a.Type.NULL, false, 'unexpected')],
    [nullNode(), a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [nullNode()])],
    [a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [nullNode()])],
  ]) {
    const malformed = signature(parameters);
    assert.equal(crypto.verify('sha256', message, keys.publicKey, Buffer.from(malformed, 'binary')), false);
    assert.throws(() => publicKey.verify(digest().digest().getBytes(), malformed), /DigestInfo/);
  }
});

test('valid SHA256 signatures with optional NULL and native crypto signatures verify', () => {
  for (const parameters of [[], [nullNode()]]) {
    assert.equal(publicKey.verify(digest().digest().getBytes(), signature(parameters)), true);
  }
  const native = crypto.sign('sha256', message, keys.privateKey);
  assert.equal(publicKey.verify(digest().digest().getBytes(), native.toString('binary')), true);
  const valid = privateKey.sign(digest());
  assert.equal(crypto.verify('sha256', message, keys.publicKey, Buffer.from(valid, 'binary')), true);
  assert.equal(publicKey.verify(forge.md.sha256.create().update('different message').digest().getBytes(), valid), false);
});

test('the actual Expo signing consumer can create, validate and sign with an ephemeral certificate', () => {
  const keyPair = { privateKey, publicKey };
  const certificate = signing.generateSelfSignedCodeSigningCertificate({
    keyPair, validityNotBefore: new Date(Date.now() - 60000),
    validityNotAfter: new Date(Date.now() + 3600000), commonName: 'NextFit local fixture',
  });
  signing.validateSelfSignedCertificate(certificate, keyPair);
  const signed = signing.signBufferRSASHA256AndVerify(privateKey, certificate, message);
  assert.ok(signed);
  // No production identity, credential, certificate or network operation is involved.
});
