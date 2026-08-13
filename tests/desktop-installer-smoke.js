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
const artifactDir = process.env.CWB_DESKTOP_ARTIFACT_DIR || path.join(root, 'output', 'desktop');
const installer = fs.existsSync(artifactDir) && fs.readdirSync(artifactDir).map(name => path.join(artifactDir, name))
  .find(file => /counselor-desk-.*-x64\.exe$/i.test(file));
if (!installer || !fs.existsSync(installer)) {
  if (process.env.CWB_REQUIRE_ARTIFACTS === '1') throw new Error(`desktop-installer-smoke: x64 NSIS installer is not present in ${artifactDir}`);
  console.log('SKIP desktop-installer-smoke: NSIS installer is not present');
  process.exit(0);
}
const installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-installer-smoke-'));
try {
  const install = spawnSync(installer, ['/S', `/D=${installDir}`], { encoding:'utf8', timeout:180000 });
  assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`);
  const installEntries = fs.readdirSync(installDir);
  const executable = installEntries.map(name => path.join(installDir, name)).find(file => /counselor-desk\.exe$/i.test(file));
  assert.ok(executable, 'NSIS installation should contain the ASCII-safe application executable');
  const smokeData = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-installer-data-'));
  const smoke = spawnSync(executable, ['--no-sandbox'], { env:Object.assign({}, process.env, { CWB_DESKTOP_SMOKE:'1', CWB_DESKTOP_USER_DATA:smokeData }), encoding:'utf8', timeout:120000 });
  assert.equal(smoke.status, 0, `${smoke.stdout}\n${smoke.stderr}`);
  assert.match(`${smoke.stdout}\n${smoke.stderr}`, /"schemaVersion":8/);
  fs.rmSync(smokeData, { recursive:true, force:true });
  const uninstaller = installEntries.map(name => path.join(installDir, name)).find(file => /^Uninstall .*\.exe$/i.test(path.basename(file)));
  assert.ok(fs.existsSync(uninstaller), 'NSIS uninstaller should be installed');
  const uninstall = spawnSync(uninstaller, ['/S'], { encoding:'utf8', timeout:180000 });
  assert.equal(uninstall.status, 0, `${uninstall.stdout}\n${uninstall.stderr}`);
  console.log('PASS desktop-installer-smoke');
} finally {
  try { fs.rmSync(installDir, { recursive:true, force:true, maxRetries:10, retryDelay:500 }); }
  catch (_) { console.warn(`installer smoke temp directory remains locked: ${installDir}`); }
}
