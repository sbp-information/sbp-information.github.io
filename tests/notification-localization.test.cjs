'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname,'..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const dict = fs.readFileSync(path.join(root,'i18n.js'),'utf8');
const scope={localStorage:{getItem:()=> 'kz'}};
vm.createContext(scope);
vm.runInContext(dict.replaceAll('export ',''),scope);

for(const [ru,kz] of [
  ['Звук и уведомления на устройство','Дыбыс және құрылғыға хабарландырулар'],
  ['Звук уведомлений','Хабарландыру дыбысы'],
  ['Ответы поддержки и новые объявления','Қолдау жауаптары мен жаңа хабарландырулар'],
  ['Послушать звук','Дыбысты тыңдау'],
  ['Уведомления на устройство включаются только с вашего разрешения','Құрылғыға хабарландырулар тек сіздің рұқсатыңызбен қосылады'],
  ['Разрешить уведомления','Хабарландыруларға рұқсат беру'],
  ['Отключить уведомления','Хабарландыруларды өшіру'],
  ['Удалить уведомление','Хабарландыруды жою'],
  ['Новое объявление','Жаңа хабарландыру'],
  ['Откройте поддержку, чтобы прочитать сообщение','Хабарламаны оқу үшін қолдау бөлімін ашыңыз'],
  ['Переключить язык','Тілді ауыстыру']
]){
  assert.equal(scope.translateUI(ru,'ru'),ru,'Russian must be preserved: '+ru);
  assert.equal(scope.translateUI(ru,'kz'),kz,'Kazakh translation missing: '+ru);
  if(!['Удалить уведомление','Новое объявление','Откройте поддержку, чтобы прочитать сообщение','Переключить язык'].includes(ru)){
    assert.ok(html.includes(ru),'notification settings no longer display '+ru);
  }
}
assert.match(app,/translateUI\('Новое объявление'\)/);
assert.match(app,/Откройте поддержку, чтобы прочитать сообщение/);
assert.match(dict,/const ATTRIBUTES = \['title','aria-label','placeholder'\]/,
  'translations must apply to accessible names and input placeholders');
console.log('Notification settings, sound and incoming announcement/support labels are bilingual.');
