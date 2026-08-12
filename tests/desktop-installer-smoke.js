const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.platform !== 'win32') {
  console.log('SKIP desktop-installer-smoke: Windows installer test only runs on Windows');
  process.exit(0);
}
const root = path.join(__dirname, '..');
const installer = path.join(root, '..', 'output', 'desktop', 'CounselorDesk-4.0.0-x64.exe');
if (!fs.existsSync(installer)) {
  console.log('SKIP desktop-installer-smoke: NSIS installer is not present');
  process.exit(0);
}
const installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-installer-smoke-'));
try {
  const install = spawnSync(installer, ['/S', `/D=${installDir}`], { encoding:'utf8', timeout:180000 });
  assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`);
  const uninstaller = path.join(installDir, 'Uninstall Counselor Desk.exe');
  assert.ok(fs.existsSync(uninstaller), 'NSIS uninstaller should be installed');
  const uninstall = spawnSync(uninstaller, ['/S'], { encoding:'utf8', timeout:180000 });
  assert.equal(uninstall.status, 0, `${uninstall.stdout}\n${uninstall.stderr}`);
  console.log('PASS desktop-installer-smoke');
} finally {
  try { fs.rmSync(installDir, { recursive:true, force:true, maxRetries:10, retryDelay:500 }); }
  catch (_) { console.warn(`installer smoke temp directory remains locked: ${installDir}`); }
}
