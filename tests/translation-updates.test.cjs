const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
// Small DOM fixture for observer batching; real browser checks are documented
// in docs/performance-19.30.md.
class Node {
  constructor(text) { this.nodeType = text === undefined ? 1 : 3; this.nodeValue = text; this.children = []; this.attrs = {}; }
  append(node) { this.children.push(node); node.parentNode = this; node.parentElement = this; return node; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  closest() { return null; }
  querySelectorAll() { return this.children.flatMap(n => n.nodeType === 1 ? [n, ...n.querySelectorAll()] : []); }
  hasAttribute(key) { return key in this.attrs; }
  getAttribute(key) { return this.attrs[key]; }
  setAttribute(key, value) { this.attrs[key] = value; }
}
for (const initial of ['ru', 'kz']) {
  let language = initial, callback, records = [];
  const queue = [], walked = [];
  const body = new Node(), a = body.append(new Node()), b = body.append(new Node());
  const first = a.append(new Node('Начало в 08:00'));
  const second = b.append(new Node('Сейчас перемена'));
  const document = { body, documentElement: {}, createTreeWalker(root) {
    walked.push(root);
    const texts = node => node.children.flatMap(n => n.nodeType === 3 ? [n] : texts(n));
    const nodes = texts(root);
    return { currentNode: null, nextNode() { this.currentNode = nodes.shift(); return !!this.currentNode; } };
  }};
  const context = { document, NodeFilter: { SHOW_TEXT: 4 }, localStorage: { getItem: () => language },
    queueMicrotask: fn => queue.push(fn), MutationObserver: class {
      constructor(fn) { callback = fn; }
      observe() {}
      disconnect() { records = []; }
      takeRecords() { const result = records; records = []; return result; }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../i18n.js'), 'utf8').replaceAll('export ', ''), context);
  context.startInterfaceTranslations(); walked.length = 0;
  first.nodeValue = 'Начало в 09:00';
  second.nodeValue = 'Идёт занятие';
  records = [{ type: 'characterData', target: second }];
  context.applyKzTranslations(a);
  assert.equal(first.nodeValue, initial === 'kz' ? 'Басталуы: 09:00' : 'Начало в 09:00');
  assert.equal(second.nodeValue, initial === 'kz' ? 'Сабақ өтіп жатыр' : 'Идёт занятие');
  assert.ok(!walked.includes(body), 'partial render must not traverse the page');
  a.setAttribute('title', 'Сейчас перемена');
  callback([{ type: 'attributes', target: a }]);
  const added = b.append(new Node('Начало в 10:00'));
  callback([{ type: 'childList', addedNodes: [added] }]);
  while (queue.length) queue.shift()();
  assert.equal(added.nodeValue, initial === 'kz' ? 'Басталуы: 10:00' : 'Начало в 10:00');
  assert.equal(a.getAttribute('title'), initial === 'kz' ? 'Қазір үзіліс' : 'Сейчас перемена');
  language = 'kz'; context.applyKzTranslations();
  assert.equal(second.nodeValue, 'Сабақ өтіп жатыр');
  language = 'ru'; context.applyKzTranslations(a);
  assert.equal(second.nodeValue, 'Идёт занятие', 'language change must include other sections');
  assert.equal(a.getAttribute('title'), 'Сейчас перемена');
}
console.log('Incremental translations: RU/KZ, queued sections, attributes, additions and language changes passed');
