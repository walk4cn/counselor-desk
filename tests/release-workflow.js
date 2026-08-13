const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(root, '.github', 'workflows', 'desktop-release.yml'), 'utf8');
const pages = fs.readFileSync(path.join(root, '.github', 'workflows', 'pages.yml'), 'utf8');

assert.match(release, /name: Tests/, 'the release pipeline must begin with the complete test gate');
assert.match(release, /windows:\s*\n[\s\S]*?needs: validate/, 'Windows packaging must wait for tests');
assert.match(release, /macos:\s*\n[\s\S]*?needs: windows/, 'macOS packaging must wait for Windows');
assert.match(release, /web:\s*\n[\s\S]*?needs: macos/, 'offline web packaging must wait for macOS');
assert.match(release, /release:\s*\n[\s\S]*?needs: \[validate, web\]/, 'a Release may only be drafted after all build gates');
assert.match(release, /--draft --verify-tag/, 'the public release starts as a verified draft');
assert.match(release, /desktop:build:win/, 'the workflow must build Windows packages');
assert.match(release, /desktop:build:mac/, 'the workflow must build macOS universal packages');
assert.match(release, /x64 and arm64 NSIS installers/, 'Windows x64 and ARM64 NSIS packages must both be required');
assert.match(release, /lipo -archs/, 'macOS packages must prove both architectures');
assert.match(release, /hdiutil attach/, 'macOS DMG mounting must be verified');
assert.match(release, /desktop-packaged-smoke\.js/, 'macOS packages must execute the packaged desktop smoke');
assert.match(release, /CWB_REQUIRE_ARTIFACTS=1/, 'CI package smoke must reject missing artifacts');
assert.match(release, /Windows-SHA256\.txt/, 'Windows checksums must be published');
assert.match(release, /macOS-SHA256\.txt/, 'macOS checksums must be published');
assert.match(release, /Web-SHA256\.txt/, 'offline web checksums must be published');

assert.doesNotMatch(pages, /push:\s*\n\s*branches:/, 'Pages must not deploy on arbitrary master pushes');
assert.match(pages, /workflow_dispatch:/, 'Pages deployment must require an explicit operator action');
assert.match(pages, /release_tag:/, 'Pages deployment must be tied to a release tag');
assert.match(pages, /gh release view/, 'Pages deployment must verify the published release');
assert.match(pages, /actions\/deploy-pages@v4/, 'the Pages deployment action remains explicit');

console.log('PASS release-workflow');
