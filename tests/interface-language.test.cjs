const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../i18n.js'),'utf8').replaceAll('export ','');
const context={localStorage:{getItem:()=> 'ru'}};vm.createContext(context);vm.runInContext(source,context);
const tr=(str,lang)=>vm.runInContext('translateUI('+JSON.stringify(str)+','+JSON.stringify(lang)+')',context);
for(const [ru,kz] of [
 ['Сейчас: Физика','Қазір: Физика'],
 ['Следующая: История Казахстана · 11:20','Келесі сабақ: Қазақстан тарихы · 11:20'],
 ['Начало в 08:00','Басталуы: 08:00'],
 ['Следующая: Занятие · 11:20 · перемена 10 мин','Келесі сабақ: Сабақ · 11:20 · үзіліс 10 минут'],
 ['Идёт занятие','Сабақ өтіп жатыр'],
 ['Сейчас перемена','Қазір үзіліс']
]){assert.equal(tr(ru,'ru'),ru);assert.equal(tr(ru,'kz'),kz);}
console.log('RU and KZ home statuses passed');
