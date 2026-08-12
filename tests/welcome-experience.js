const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

(async () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace('<script defer src="src/core/v4-runtime.js" data-v4-runtime></script>', () => `<script>${fs.readFileSync(path.join(root, 'src/core/v4-runtime.js'), 'utf8')}</script>`);
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => {
    if (!/Could not load script:.*(?:xlsx\.full\.min\.js|argon2-bundled\.min\.js|jszip\.min\.js|echarts\.min\.js)/.test(error.message)) console.error(error);
  });
  const dom = new JSDOM(html, { runScripts:'dangerously', resources:'usable', url:'https://c.local/', pretendToBeVisual:true, virtualConsole });
  await new Promise(resolve => setTimeout(resolve, 650));
  const cwb = dom.window.CWB;
  assert.ok(cwb && cwb.welcome, 'welcome API should exist');
  assert.ok(cwb.db.settings.welcome_experience, 'welcome preferences should be initialized');
  const setup = dom.window.document.querySelector('#modal-root .modal');
  assert.match(setup.textContent, /以后每次打开，都有人先向你问好/, 'first open should explain welcome experience');
  setup.querySelector('#welcome-name').value = '张三';
  setup.querySelector('#welcome-address').value = '张老师';
  setup.querySelector('[data-welcome-save]').click();
  await new Promise(resolve => setTimeout(resolve, 260));
  const daily = dom.window.document.querySelector('#modal-root .modal');
  assert.match(daily.textContent, /张老师/);
  assert.match(daily.textContent, /Chinese Text Project|陶行知|叶圣陶|UNESCO/);
  assert.equal(cwb.db.settings.counselor_name, '张三');
  assert.equal(cwb.db.settings.welcome_experience.addressed_as, '张老师');
  daily.querySelector('[data-close]').click();
  assert.equal(cwb.welcome.showDaily(false), false, 'same-day refresh should not repeat automatically');
  console.log('PASS welcome-experience');
})().catch(error => { console.error(error); process.exitCode = 1; });
