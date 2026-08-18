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
assert.match(tests, /pnpm run check:secrets/, 'the PR test gate must scan for exposed credentials');
assert.match(tests, /xvfb-run -a pnpm test/, 'Ubuntu CI must provide a virtual display for the required Electron smoke');

assert.match(release, /name: Tests/, 'the release pipeline must begin with the complete test gate');
assert.match(release, /xvfb-run -a pnpm test/, 'the release test gate must provide a virtual display for Electron smoke');
assert.match(release, /tags:\s*\['v4\.4\.\*'\]/, 'the v4.4 release workflow must accept only v4.4 patch tags, including post-release fixes');
assert.match(release, /node -p 'require\("\.\/package\.json"\)\.version'/, 'the release gate must read package.json with Bash-safe quoting');
assert.doesNotMatch(release, /node -p \\\"require\('\.\/package\.json'\)\.version\\\"/, 'the release gate must not escape JavaScript quotes into an invalid Bash command');
assert.match(release, /windows:\s*\n[\s\S]*?needs: validate/, 'Windows packaging must wait for tests');
assert.match(release, /macos:\s*\n[\s\S]*?needs: \[validate, windows\]/, 'macOS packaging must wait for Windows and retain validate outputs');
assert.match(release, /web:\s*\n[\s\S]*?needs: \[validate, macos\]/, 'offline web packaging must wait for macOS and retain validate outputs');
assert.match(release, /release:\s*\n[\s\S]*?needs: \[validate, web\]/, 'a Release may only be drafted after all build gates');
assert.match(release, /release:\s*\n[\s\S]*?uses: actions\/checkout@v4[\s\S]*?ref: refs\/tags\/\$\{\{ needs\.validate\.outputs\.tag \}\}[\s\S]*?actions\/download-artifact@v4/, 'the draft Release job must check out the verified tag before gh --verify-tag');
assert.match(release, /--draft --verify-tag/, 'the public release starts as a verified draft');
assert.match(release, /gh release delete "\$tag" --yes/, 'rebuilding an explicitly retagged release must replace its stale draft and assets');
assert.match(release, /isDraft,isPrerelease/, 'release rebuilds must inspect existing release state before replacement');
assert.match(release, /Refusing to replace an existing published or prerelease Release/, 'published releases must never be deleted by a rerun');
assert.match(release, /find release-assets -type f -name '\*\.html'/, 'the web artifact must be found without a stale hard-coded version directory');
assert.match(release, /--notes-file release-notes\.md/, 'Release notes must be generated from the checked-in changelog');
assert.match(release, /name: windows-v\$\{\{ needs\.validate\.outputs\.version \}\}/, 'Windows artifact names must follow the validated version');
assert.match(release, /name: macos-v\$\{\{ needs\.validate\.outputs\.version \}\}/, 'macOS artifact names must follow the validated version');
assert.match(release, /name: web-v\$\{\{ needs\.validate\.outputs\.version \}\}/, 'web artifact names must follow the validated version');
assert.match(release, /CounselorDesk-v\$version-Offline\.html/, 'the offline HTML asset must have a recognizable product download name');
assert.match(release, /desktop:build:win/, 'the workflow must build Windows packages');
assert.match(release, /desktop:build:mac/, 'the workflow must build macOS universal packages');
assert.match(release, /x64 and arm64 NSIS installers/, 'Windows x64 and ARM64 NSIS packages must both be required');
assert.match(release, /output\/desktop\/counselor-desk-\*-x64\.exe[\s\S]*output\/desktop\/counselor-desk-\*-arm64\.exe/, 'the public Release must upload only the explicitly verified Windows architecture installers');
assert.doesNotMatch(release, /output\/desktop\/\*\.exe/, 'the public Release must not upload unverified generic Windows executables');
assert.match(release, /desktop-windows-architecture\.js/, 'Windows packages must verify PE architectures, not only artifact names');
assert.match(release, /lipo -archs/, 'macOS packages must prove both architectures');
assert.match(release, /chmod \+x "\$binary"/, 'the ZIP smoke must restore the packaged macOS binary execute bit before launch');
assert.match(release, /hdiutil attach/, 'macOS DMG mounting must be verified');
assert.match(release, /desktop-packaged-smoke\.js/, 'macOS packages must execute the packaged desktop smoke');
assert.match(release, /CWB_DESKTOP_EXECUTABLE="\$binary" CWB_REQUIRE_ARTIFACTS=1 pnpm exec node tests\/desktop-packaged-smoke\.js/, 'the ZIP smoke must launch the same macOS binary that passed lipo verification');
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
