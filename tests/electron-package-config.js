const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = fs.readFileSync(path.resolve(__dirname, '..', 'electron-builder.yml'), 'utf8');

assert.match(config, /^productName: 辅导员工作台$/m, 'The installed product name must remain Chinese');
assert.match(config, /^executableName: counselor-desk$/m, 'The Windows executable must use an ASCII-safe file name for installation');
assert.match(config, /^icon: assets\/app-icon\.svg$/m, 'The shared icon remains SVG so macOS can generate its native icon format');
assert.match(config, /^win:\r?\n  icon: assets\/app-icon\.ico$/m, 'Windows builds must use the checked-in ICO asset instead of converting SVG during packaging');
assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'assets', 'app-icon.ico')), 'the Windows ICO asset must be present for reproducible packaging');
assert.match(config, /^  shortcutName: 辅导员工作台$/m, 'The desktop shortcut must remain Chinese for ordinary users');
assert.match(config, /^    - nsis$/m, 'Windows release builds must use the requested NSIS installer target');
assert.doesNotMatch(config, /^    - msi$/m, 'Windows release builds must use one installer contract');
assert.doesNotMatch(config, /^    - portable$/m, 'Windows release builds must not use the failed portable target');
assert.match(config, /^  - assets\/welcome-education-scene-v2\.png$/m, 'the welcome illustration must ship inside desktop builds');
for (const runtime of ['v8-migration.js', 'v8-persistence-protocol.js', 'v8-workspace-runtime.js', 'v8-backup-codec.js']) {
  assert.match(config, new RegExp(`^  - src/core/${runtime.replace('.', '\\.')}$`, 'm'), `${runtime} must ship inside desktop builds`);
}

console.log('PASS electron-package-config');
