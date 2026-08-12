const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const packagedRoot = path.join(root, '..', 'output', 'desktop');
const candidates = process.platform === 'win32'
  ? [path.join(packagedRoot, 'win-unpacked', 'Counselor Desk.exe'), path.join(packagedRoot, 'win-unpacked', 'CounselorDesk.exe')]
  : [path.join(packagedRoot, 'mac', 'Counselor Desk.app', 'Contents', 'MacOS', 'Counselor Desk')];
const executable = candidates.find(file => fs.existsSync(file));
if (!executable) {
  console.log('SKIP desktop-packaged-smoke: packaged executable is not present');
  process.exit(0);
}
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-packaged-smoke-'));
try {
  const result = spawnSync(executable, ['--no-sandbox'], {
    cwd:root,
    env:Object.assign({}, process.env, { CWB_DESKTOP_SMOKE:'1', CWB_DESKTOP_USER_DATA:userData }),
    encoding:'utf8', timeout:120000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /"ok":true/);
  assert.match(output, /"schemaVersion":7/);
  assert.match(output, /"sqlite":true/);
  assert.match(output, /"migration":true/);
  console.log('PASS desktop-packaged-smoke');
} finally {
  fs.rmSync(userData, { recursive:true, force:true });
}
