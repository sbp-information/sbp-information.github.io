const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const context = {localStorage:{getItem:()=> 'kz'}};
vm.createContext(context);
vm.runInContext(read('i18n.js').replaceAll('export ', ''), context);
for (const [ru, kz] of [
  ['Следующая','Келесі сабақ'],
  ['Ближайшая перемена','Ең жақын үзіліс'],
  ['Скрыть сообщение','Хабарламаны жасыру'],
  ['Отменить','Болдырмау'],
  ['Восстановление…','Қалпына келтірілуде…'],
  ['Тип объявления','Хабарландыру түрі'],
  ['Заголовок на русском','Орыс тіліндегі тақырып'],
  ['Текст на казахском','Қазақ тіліндегі мәтін'],
  ['Облако временно недоступно','Бұлт уақытша қолжетімсіз'],
  ['Офлайн — ожидают синхронизации: 3','Офлайн — синхрондауды күтуде: 3'],
  ['Подключено — синхронизация изменений: 2','Қосылған — өзгерістер синхрондалуда: 2'],
  ['На выбранный день нет пар','Таңдалған күнде сабақ жоқ'],
  ['Не удалось определить день расписания','Сабақ кестесінің күнін анықтау мүмкін болмады']
]) {
  assert.equal(context.translateUI(ru,'ru'),ru);
  assert.equal(context.translateUI(ru,'kz'),kz);
}
// Every notification delivery status, including failure overrides, is localized.
for(const match of read('notification-center.js').matchAll(/(?:statusOverride\s*=|text\s*=)\s*'([^']*[А-Яа-яЁё][^']*)'/g)) {
  assert.notEqual(context.translateUI(match[1],'kz'),match[1],match[1]);
}
// System error banners must all have a translation, not only the happy path.
const issues = read('app.js').split('function friendlyIssue(')[1].split('function ')[0];
for(const match of issues.matchAll(/'([^'\n]*[А-Яа-яЁё][^'\n]*)'/g)) {
  assert.notEqual(context.translateUI(match[1],'kz'),match[1],match[1]);
}
const release = read('release-data.js').split("version:'19.34'")[1].split("version:'19.33'")[0];
assert.match(release,/ru:\[/); assert.match(release,/kz:\[/);
console.log('RU/KZ labels, dynamic sync counts, notification failures and system errors passed');

// Names and message bodies are user data even if they equal a UI dictionary key.
const box = {innerHTML:'',scrollHeight:0};
const supportContext = {document:{getElementById:()=>box},
  escapeNotificationText:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;'),
  interfaceLocale:()=> 'kk-KZ'};
vm.createContext(supportContext);
const renderer=read('app.js').split('function renderSupportMessages(msgs)')[1].split('window.sendSupportMessage')[0];
vm.runInContext('function renderSupportMessages(msgs)'+renderer,supportContext);
supportContext.renderSupportMessages([{role:'visitor',author:'Поддержка',text:'Сохранить <мой текст>'}]);
assert.match(box.innerHTML,/<strong data-i18n-skip>Поддержка<\/strong>/);
assert.match(box.innerHTML,/<p data-i18n-skip>Сохранить &lt;мой текст><\/p>/);
