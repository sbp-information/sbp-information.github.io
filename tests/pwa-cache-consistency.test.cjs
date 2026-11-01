const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const worker = read('notifications-sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));
const release = read('release-data.js');
const build = html.match(/<meta name="app-build" content="([^"]+)"/)?.[1];
assert.match(build, /^step19\.32-push-coldstart-2026-11-01-v1$/);
assert.match(worker, /CACHE_NAME = 'sbp-shell-20261101-push-coldstart-v1'/);
assert.match(release, /version:'19\.32',date:'2026-11-01'/);
assert.match(read('release-notes.js'), /release-data\.js\?v=20261101-push-coldstart-v1/);
const core = worker.match(/const CORE_ASSETS = \[([\s\S]*?)\];/)?.[1];
assert.ok(core, 'worker has a precache list');
assert.ok(worker.includes('push-worker-config.js?v=20261101-cloudflare-live-v2'), 'Cloudflare configuration must be cached for installed Android PWA');
const assets = [...core.matchAll(/'([^']+)'/g)].map(m => m[1]);
const paths = assets.filter(url => url.startsWith('./') && url !== './').map(url => url.slice(2).split('?')[0]);
assert.equal(new Set(paths).size, paths.length, 'no duplicate asset paths with conflicting versions');
const linked = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)]
  .map(m => m[1]).filter(url => !url.startsWith('http') && /\.(?:css|js|png|webmanifest)(?:\?|$)/.test(url));
for (const asset of [...linked, ...manifest.icons.map(icon => icon.src)]) {
  const normalized = './' + asset.replace(/^\.\//, '');
  assert.ok(assets.includes(normalized), 'precache must match page: ' + asset);
  assert.ok(fs.existsSync(path.join(root, asset.split('?')[0])), 'asset must exist: ' + asset);
}
console.log('PWA cache consistency: build, icon files, page assets, and cache versions passed.');

// Check that shared ES modules are consistently versioned and cached in the installed PWA.
const moduleFiles = fs.readdirSync(root).filter(name => name.endsWith('.js'));
const moduleVersions = new Map();
for (const file of moduleFiles) {
  for (const match of read(file).matchAll(/from\s*['"](\.\/[^'"]+)['"]/g)) {
    const url = match[1];
    const name = url.split('?')[0].replace(/^\.\//,'');
    const versions = moduleVersions.get(name) || new Set();
    versions.add(url);
    moduleVersions.set(name,versions);
    assert.ok(assets.includes('./'+url.replace(/^\.\//,'')),file+' dependency missing from PWA: '+url);
  }
}
for (const [name,versions] of moduleVersions) {
  assert.equal(versions.size,1,'duplicate module instances for '+name);
  if (['i18n.js','schedule.js','group-tools.js','action-history.js','release-data.js','utils.js'].includes(name)) {
    assert.ok([...versions][0].endsWith('?v=20261101-localization-v1'),'stale version for '+name);
  }
}
