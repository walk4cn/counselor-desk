const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const release = fs.readFileSync(path.join(root, '.github', 'workflows', 'desktop-release.yml'), 'utf8');
const macos = fs.readFileSync(path.join(root, '.github', 'workflows', 'desktop-macos.yml'), 'utf8');
const pages = fs.readFileSync(path.join(root, '.github', 'workflows', 'pages.yml'), 'utf8');
const tests = fs.readFileSync(path.join(root, '.github', 'workflows', 'tests.yml'), 'utf8');

assert.match(tests, /timeout-minutes:\s*(?:[2-9]\d|1\d\d)/, 'the complete test workflow must allow the measured full suite to finish');
assert.match(tests, /pnpm run lint/, 'the PR test gate must check the source surface before tests run');
assert.match(tests, /pnpm run check:public/, 'the PR test gate must scan the public product surface');
assert.match(tests, /xvfb-run -a pnpm test/, 'Ubuntu CI must provide a virtual display for the required Electron smoke');

assert.match(release, /name: Tests/, 'the release pipeline must begin with the complete test gate');
assert.match(release, /xvfb-run -a pnpm test/, 'the release test gate must provide a virtual display for Electron smoke');
assert.match(release, /tags:\s*\['v4\.4\.0'\]/, 'the v4.4 release workflow must not create releases for arbitrary version tags');
assert.match(release, /node -p 'require\("\.\/package\.json"\)\.version'/, 'the release gate must read package.json with Bash-safe quoting');
assert.doesNotMatch(release, /node -p \\\"require\('\.\/package\.json'\)\.version\\\"/, 'the release gate must not escape JavaScript quotes into an invalid Bash command');
assert.match(release, /windows:\s*\n[\s\S]*?needs: validate/, 'Windows packaging must wait for tests');
assert.match(release, /macos:\s*\n[\s\S]*?needs: windows/, 'macOS packaging must wait for Windows');
assert.match(release, /web:\s*\n[\s\S]*?needs: macos/, 'offline web packaging must wait for macOS');
assert.match(release, /release:\s*\n[\s\S]*?needs: \[validate, web\]/, 'a Release may only be drafted after all build gates');
assert.match(release, /--draft --verify-tag/, 'the public release starts as a verified draft');
assert.match(release, /desktop:build:win/, 'the workflow must build Windows packages');
assert.match(release, /desktop:build:mac/, 'the workflow must build macOS universal packages');
assert.match(release, /x64 and arm64 NSIS installers/, 'Windows x64 and ARM64 NSIS packages must both be required');
assert.match(release, /desktop-windows-architecture\.js/, 'Windows packages must verify PE architectures, not only artifact names');
assert.match(release, /lipo -archs/, 'macOS packages must prove both architectures');
assert.match(release, /hdiutil attach/, 'macOS DMG mounting must be verified');
assert.match(release, /desktop-packaged-smoke\.js/, 'macOS packages must execute the packaged desktop smoke');
assert.match(release, /CWB_REQUIRE_ARTIFACTS=1/, 'CI package smoke must reject missing artifacts');
assert.match(release, /Windows-SHA256\.txt/, 'Windows checksums must be published');
assert.match(release, /macOS-SHA256\.txt/, 'macOS checksums must be published');
assert.match(release, /Web-SHA256\.txt/, 'offline web checksums must be published');

assert.match(macos, /CFBundleExecutable/, 'the macOS push gate must read the executable name from the packaged app metadata');
assert.match(macos, /plutil -extract CFBundleExecutable raw/, 'the macOS push gate must not hard-code a localized binary file name');
assert.doesNotMatch(macos, /Contents\/MacOS\/辅导员工作台/, 'the macOS push gate must not require a binary name that differs from executableName');

assert.doesNotMatch(pages, /push:\s*\n\s*branches:/, 'Pages must not deploy on arbitrary master pushes');
assert.match(pages, /workflow_dispatch:/, 'Pages deployment must require an explicit operator action');
assert.match(pages, /release_tag:/, 'Pages deployment must be tied to a release tag');
assert.match(pages, /gh release view/, 'Pages deployment must verify the published release');
assert.match(pages, /\.isDraft == false and \.isPrerelease == false/, 'Pages must only deploy a final, non-prerelease release');
assert.match(pages, /Prepare public site artifact/, 'Pages must stage a product-only site artifact');
assert.match(pages, /mkdir -p site\/assets site\/vendor site\/src\/core/, 'Pages must explicitly scope the site artifact');
assert.match(pages, /path: site/, 'Pages must deploy the staged site, never the full repository');
assert.doesNotMatch(pages, /path: \./, 'Pages must not upload the entire repository');
assert.match(pages, /actions\/deploy-pages@v4/, 'the Pages deployment action remains explicit');

console.log('PASS release-workflow');
