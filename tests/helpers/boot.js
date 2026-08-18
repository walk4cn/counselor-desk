const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader } = require('jsdom');
const { TextEncoder, TextDecoder } = require('node:util');

const projectRoot = path.join(__dirname, '..', '..');

class LocalResourceLoader extends ResourceLoader {
  fetch(url) {
    const requestUrl = new URL(String(url));
    if (requestUrl.origin === 'http://localhost') {
      const local = path.join(projectRoot, decodeURIComponent(requestUrl.pathname.replace(/^\//, '')));
      if (fs.existsSync(local)) return Promise.resolve(Buffer.from(fs.readFileSync(local)));
    }
    return Promise.reject(new Error(`local resource not found: ${url}`));
  }
}

function bootApp(filePath, options = {}) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
  const html = fs.readFileSync(resolved, 'utf8');
  const { beforeParse, virtualConsole } = options;
  return new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    resources: new LocalResourceLoader(),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      if (beforeParse) beforeParse(window);
      if (!window.TextEncoder) window.TextEncoder = TextEncoder;
      if (!window.TextDecoder) window.TextDecoder = TextDecoder;
    },
  });
}

module.exports = { bootApp, LocalResourceLoader };