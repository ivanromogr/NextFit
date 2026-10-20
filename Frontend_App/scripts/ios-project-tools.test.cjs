// Exercises the actual CommonJS xcode consumer, not a mocked uuid implementation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xcode = require('xcode');

test('xcode can generate identifiers and round-trip a modified project', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nextfit-pbx-'));
  const filename = path.join(directory, 'project.pbxproj');
  const rootGroup = 'BBBBBBBBBBBBBBBBBBBBBBBB';
  const fixture = `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {};
  objectVersion = 54;
  objects = {
/* Begin PBXProject section */
    AAAAAAAAAAAAAAAAAAAAAAAA /* Project object */ = {
      isa = PBXProject;
      mainGroup = ${rootGroup};
      targets = ();
    };
/* End PBXProject section */
/* Begin PBXGroup section */
    ${rootGroup} /* Main group */ = {
      isa = PBXGroup;
      children = ();
      sourceTree = "<group>";
    };
/* End PBXGroup section */
  };
  rootObject = AAAAAAAAAAAAAAAAAAAAAAAA /* Project object */;
}
`;
  try {
    fs.writeFileSync(filename, fixture);
    const project = xcode.project(filename);
    project.parseSync();
    const first = project.addPbxGroup([], 'Beta fixture', 'Fixtures');
    const second = project.addPbxGroup([], 'Resources fixture', 'Resources');
    assert.match(first.uuid, /^[0-9A-F]{24}$/);
    assert.match(second.uuid, /^[0-9A-F]{24}$/);
    assert.notEqual(first.uuid, second.uuid);
    project.addToPbxGroup(first.uuid, rootGroup);
    project.addToPbxGroup(second.uuid, rootGroup);
    fs.writeFileSync(filename, project.writeSync());
    const restored = xcode.project(filename);
    restored.parseSync();
    assert.equal(restored.getPBXGroupByKey(first.uuid).name.replace(/^"|"$/g, ''), 'Beta fixture');
    const children = restored.getPBXGroupByKey(rootGroup).children;
    assert.deepEqual(children.map(child => child.value), [first.uuid, second.uuid]);
    assert.ok(restored.allUuids().includes(first.uuid));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
