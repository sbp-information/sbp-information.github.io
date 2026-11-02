import { PUSH_WORKER_URL } from './push-worker-config.js?v=20261101-cloudflare-live-v2';
const words={
ru:{phoneEyebrow:'ПРОВЕРКА НА ТЕЛЕФОНЕ',installTitle:'Установите Push Test',installText:'Откройте эту публичную страницу на телефоне и установите тестовое приложение. Оно открывает сразу эту проверку.',installButton:'Установить приложение',openChrome:'Открыть в Google Chrome',browserTip:'Если страница открыта внутри ChatGPT или мессенджера, выберите «Открыть во внешнем браузере». Затем установите Push Test через меню Chrome.',androidManualInstall:'Во встроенном браузере установка может быть недоступна. Нажмите «Открыть в Chrome» или откройте ссылку во внешнем браузере.',copyLink:'Скопировать ссылку для телефона',installHelp:'Как установить на Android или iPhone',androidHelp:'Android: откройте ссылку в Chrome → меню ⋮ → «Установить приложение» или «Добавить на главный экран».',iphoneHelp:'iPhone: откройте ссылку в Safari → «Поделиться» → «На экран Домой». Затем откройте Push Test с новой иконки.',desktopHelp:'На компьютере установка необязательна: подключите уведомления ниже и нажмите «Отправить Push». Ожидайте системное уведомление за пределами страницы.',copied:'Публичная ссылка скопирована. Отправьте её себе и откройте на телефоне.',installed:'Приложение установлено. Откройте Push Test с его иконки.',standalone:'Вы открыли установленное приложение.',manualInstall:'Если окно установки не появилось, воспользуйтесь инструкцией ниже.',copyFailed:'Скопируйте ссылку из адресной строки публичной страницы.',stepLocal:'01 / БРАУЗЕР',stepBackground:'03 / ФОН',
eyebrow:'ДИАГНОСТИКА УВЕДОМЛЕНИЙ',title:'Проверим, доходит ли Push.',lead:'Три коротких теста — от разрешения браузера до доставки при закрытом сайте.',privacy:'Тесты приходят только на это устройство',connection:'ПОДКЛЮЧЕНИЕ',setupTitle:'Подготовьте устройство',prepare:'Подключить уведомления',
ios:'На iPhone откройте установленное приложение с экрана «Домой». Проверка в обычной вкладке может быть недоступна.',tests:'Тесты',
localTitle:'Показ на устройстве',localText:'Проверяет разрешение и показ уведомления браузером. Без отправки через сервер.',localButton:'Показать уведомление',
pushTitle:'Доставка с сервера',pushText:'Настоящий Push через ту же систему, что отправляет уведомления поддержки.',pushButton:'Отправить Push',
backgroundTitle:'При закрытом сайте',backgroundText:'Запустите тест и закройте страницу. Сервер отправит Push через 1–2 минуты, по своему таймеру.',backgroundButton:'Запустить отложенный тест',
resultsEyebrow:'ЧТО ПРОИЗОШЛО',results:'Результаты проверки',refresh:'Обновить',resultsHint:'«Отправлено» означает приём Push-службой. «Получено устройством» — обработку уведомления браузером. Звук и показ на экране зависят от настроек телефона.',log:'Журнал этой страницы',clear:'Очистить журнал',back:'Вернуться на основной сайт',
unsupported:'В этом браузере Push недоступен. Откройте страницу в поддерживаемом браузере или установленном приложении.',
ready:'Устройство подключено. Можно запускать тесты.',notReady:'Сначала подключите уведомления на этом устройстве.',denied:'Уведомления заблокированы. Разрешите их в настройках сайта и повторите проверку.',default:'Разрешение на уведомления ещё не получено.',
preparing:'Подключаем это устройство…',connected:'Подписка подключена к серверу.',localShown:'Браузер выполнил команду показа локального уведомления.',localBody:'Локальный тест. Он не проверяет доставку с сервера.',
queued:'Тест запланирован. Закройте страницу и подождите 1–2 минуты.',sent:'Push-служба приняла уведомление.',received:'Получено устройством',pending:'Ожидает отправки',accepted:'Отправлено',expired:'Время теста истекло',cancelled:'Подписка недоступна',
empty:'Серверных тестов пока нет.',noLog:'Запустите проверку — здесь появятся её шаги.',planned:'Запланировано',arrival:'Получено',delay:'Задержка от запланированного времени',seconds:'с',test:'Проверка',error:'Не удалось выполнить проверку. Проверьте интернет и повторите.',rate:'Подождите 30 секунд перед следующим серверным тестом.',auth:'Не удалось войти. Откройте основной сайт, дождитесь входа и вернитесь к проверке.',subscription:'Сначала подключите устройство кнопкой выше.',refreshDone:'Результаты обновлены.',pageTitle:'Проверка уведомлений · SBP Information'
},
kz:{phoneEyebrow:'ТЕЛЕФОНДА ТЕКСЕРУ',installTitle:'Push Test орнатыңыз',installText:'Осы жария бетті телефонда ашып, тест қолданбасын орнатыңыз. Ол бірден осы тексерісті ашады.',installButton:'Қолданбаны орнату',openChrome:'Google Chrome браузерінде ашу',browserTip:'Бет ChatGPT немесе мессенджер ішінде ашылса, «Сыртқы браузерде ашу» пәрменін таңдаңыз. Содан кейін Push Test қолданбасын Chrome мәзірі арқылы орнатыңыз.',androidManualInstall:'Кіріктірілген браузерде орнату қолжетімсіз болуы мүмкін. «Chrome браузерінде ашу» батырмасын басыңыз немесе сілтемені сыртқы браузерде ашыңыз.',copyLink:'Телефонға арналған сілтемені көшіру',installHelp:'Android немесе iPhone құрылғысына орнату',androidHelp:'Android: сілтемені Chrome браузерінде ашыңыз → ⋮ мәзірі → «Қолданбаны орнату» немесе «Басты экранға қосу».',iphoneHelp:'iPhone: сілтемені Safari браузерінде ашыңыз → «Бөлісу» → «Басты экранға қосу». Содан кейін жаңа белгішеден Push Test ашыңыз.',desktopHelp:'Компьютерде орнату міндетті емес: төменде хабарландыруларды қосып, «Push жіберу» батырмасын басыңыз. Беттен тыс жүйелік хабарландыруды күтіңіз.',copied:'Жария сілтеме көшірілді. Өзіңізге жіберіп, телефонда ашыңыз.',installed:'Қолданба орнатылды. Push Test белгішесін ашыңыз.',standalone:'Орнатылған қолданба ашылды.',manualInstall:'Орнату терезесі ашылмаса, төмендегі нұсқаулықты пайдаланыңыз.',copyFailed:'Жария беттің мекенжай жолағынан сілтемені көшіріңіз.',stepLocal:'01 / БРАУЗЕР',stepBackground:'03 / ФОН',
eyebrow:'ХАБАРЛАНДЫРУЛАРДЫ ТЕКСЕРУ',title:'Push жететінін тексерейік.',lead:'Браузер рұқсатынан бастап жабық сайтқа жеткізуге дейінгі үш қысқа тексеріс.',privacy:'Тест хабарламалары тек осы құрылғыға келеді',connection:'ҚОСЫЛУ',setupTitle:'Құрылғыны дайындаңыз',prepare:'Хабарландыруларды қосу',
ios:'iPhone құрылғысында басты экранға орнатылған қолданбаны ашыңыз. Кәдімгі браузер бетінде тексеріс қолжетімсіз болуы мүмкін.',tests:'Тексерістер',
localTitle:'Құрылғыда көрсету',localText:'Браузер рұқсатын және хабарландыруды көрсету мүмкіндігін тексереді. Серверден жіберілмейді.',localButton:'Хабарландыруды көрсету',
pushTitle:'Серверден жеткізу',pushText:'Қолдау хабарламаларын жіберетін жүйе арқылы нақты Push жібереді.',pushButton:'Push жіберу',
backgroundTitle:'Сайт жабық кезде',backgroundText:'Тексерісті іске қосып, бетті жабыңыз. Сервер өз таймері бойынша 1–2 минуттан кейін Push жібереді.',backgroundButton:'Кейінге қалдырылған тест',
resultsEyebrow:'НӘТИЖЕ',results:'Тексеру нәтижелері',refresh:'Жаңарту',resultsHint:'«Жіберілді» — Push қызметі хабарламаны қабылдады. «Құрылғы алды» — браузер хабарландыруды өңдеді. Дыбыс пен экранда көрсету телефон баптауларына байланысты.',log:'Осы беттің журналы',clear:'Журналды тазарту',back:'Негізгі сайтқа оралу',
unsupported:'Бұл браузерде Push қолжетімсіз. Бетті қолдайтын браузерде немесе орнатылған қолданбада ашыңыз.',
ready:'Құрылғы қосылды. Тексерістерді бастауға болады.',notReady:'Алдымен осы құрылғыда хабарландыруларды қосыңыз.',denied:'Хабарландырулар бұғатталған. Сайт баптауларында рұқсат беріп, қайта тексеріңіз.',default:'Хабарландыруларға әлі рұқсат берілген жоқ.',
preparing:'Осы құрылғы қосылуда…',connected:'Жазылым серверге қосылды.',localShown:'Браузер жергілікті хабарландыруды көрсету пәрменін орындады.',localBody:'Жергілікті тест. Серверден жеткізуді тексермейді.',
queued:'Тест жоспарланды. Бетті жауып, 1–2 минут күтіңіз.',sent:'Push қызметі хабарландыруды қабылдады.',received:'Құрылғы алды',pending:'Жіберілуді күтуде',accepted:'Жіберілді',expired:'Тест уақыты аяқталды',cancelled:'Жазылым қолжетімсіз',
empty:'Серверлік тесттер әлі жоқ.',noLog:'Тексерісті бастаңыз — оның қадамдары осында көрсетіледі.',planned:'Жоспарланды',arrival:'Қабылданды',delay:'Жоспарланған уақыттан кешігу',seconds:'с',test:'Тексеріс',error:'Тексеру орындалмады. Интернетті тексеріп, қайталаңыз.',rate:'Келесі серверлік тестке дейін 30 секунд күтіңіз.',auth:'Кіру орындалмады. Негізгі сайтты ашып, кіргенше күтіңіз де, тексеріске оралыңыз.',subscription:'Алдымен жоғарыдағы батырмамен құрылғыны қосыңыз.',refreshDone:'Нәтижелер жаңартылды.',pageTitle:'Хабарландыруларды тексеру · SBP Information'
}};
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let baseLang='ru';try{baseLang=localStorage.getItem('toe_ui_language')==='kz'?'kz':'ru';}catch{}
let lang=read('sbp_test_language',baseLang)==='kz'?'kz':'ru',logs=read('sbp_test_log',[]),tests=[],receipts={},ready=false,busy=false,feedback='',registration,subscription,auth,authPromise;
if(!Array.isArray(logs))logs=[];
let installPrompt=null,installStatus='',workerPromise;
const installedMode=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isAndroid=()=>/Android/i.test(navigator.userAgent||'');
const t=key=>words[lang][key]||key;
const supported=()=>window.isSecureContext&&'Notification'in window&&'serviceWorker'in navigator&&'PushManager'in window;
const time=value=>new Date(value).toLocaleTimeString(lang==='kz'?'kk-KZ':'ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
function element(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function render(){
 document.documentElement.lang=lang==='kz'?'kk':'ru';document.title=t('pageTitle');
 document.querySelectorAll('[data-text]').forEach(el=>el.textContent=t(el.dataset.text));
 document.querySelectorAll('[data-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.aria)));
 $('language').textContent=lang==='ru'?'ҚАЗ':'РУС';$('language').setAttribute('aria-label',lang==='ru'?'Қазақша':'Русский');
 $('device-status').textContent=t(!supported()?'unsupported':Notification.permission==='denied'?'denied':ready?'ready':Notification.permission==='default'?'default':'notReady');
 $('feedback').textContent=feedback?t(feedback):'';
 $('install-status').textContent=t(installedMode()?'standalone':installStatus)||'';
 $('install').disabled=installedMode();
 $('open-chrome').hidden=!isAndroid()||installedMode();
 $('android-browser-tip').hidden=!isAndroid()||installedMode();
 for(const id of ['prepare','local','immediate','delayed','refresh'])$(id).disabled=busy||!supported()||(id!=='prepare'&&!ready);
 $('log').replaceChildren();
 if(!logs.length)$('log').append(element('li',t('noLog')));
 for(const item of logs.slice(0,15)){const row=element('li','');row.append(element('time',time(item.at)),document.createTextNode(t(item.key)));$('log').append(row);}
 $('results').replaceChildren();
 if(!tests.length)$('results').append(element('p',t('empty'),'hint'));
 for(const item of tests){
  const receipt=receipts[item.id],row=element('div','','result'),body=element('div','');
  body.append(element('strong',t('test')+' · '+time(item.created_at)),element('p',t('planned')+': '+time(item.run_at)));
  if(receipt)body.append(element('p',t('arrival')+': '+time(receipt.receivedAt)+' · '+t('delay')+': '+Math.max(0,Math.round((receipt.receivedAt-item.run_at)/1000))+' '+t('seconds')));
  row.append(body,element('span',t(receipt?'received':({sent:'accepted',queued:'pending',expired:'expired',cancelled:'cancelled'}[item.state]||'pending')),'badge'));
  $('results').append(row);
 }
}
function log(key){feedback=key;logs.unshift({key,at:Date.now()});logs=logs.slice(0,30);save('sbp_test_log',logs);render();}
async function identity(){
 if(!authPromise)authPromise=(async()=>{
  const fb=await import('./firebase.js?v=20261017-admin-tap-v1');
  auth=fb.createFirebaseServices().auth;
  await new Promise((resolve,reject)=>{let stop;stop=fb.onAuthStateChanged(auth,()=>{stop?.();resolve();},reject);});
  if(!auth.currentUser)await fb.signInAnonymously(auth);
  return auth;
 })().catch(error=>{authPromise=null;throw error;});
 return authPromise;
}
async function api(path,data){
 await identity();
 const token=await auth.currentUser.getIdToken();
 const response=await fetch(PUSH_WORKER_URL+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Object.assign(new Error('HTTP '+response.status),{status:response.status});
 return response.json();
}
async function worker(){
 if(!workerPromise)workerPromise=setupWorker().catch(error=>{workerPromise=null;throw error;});
 return workerPromise;
}
async function setupWorker(){
 registration=await navigator.serviceWorker.register('./notifications-sw.js',{scope:'./',updateViaCache:'none'});
 await registration.update();
 const waiting=registration.waiting;
 if(waiting)waiting.postMessage({type:'SKIP_WAITING'});
 // Wait for an installing update so receipts and the dedicated test link work on first visit.
 const installing=registration.installing||waiting;
 if(installing)await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('worker-timeout')),20000);
  const changed=()=>{if(installing.state==='installed'){registration.waiting?.postMessage({type:'SKIP_WAITING'});}
   if(installing.state==='activated'){clearTimeout(timer);resolve();}
   if(installing.state==='redundant'){clearTimeout(timer);reject(new Error('worker-redundant'));}};
  installing.addEventListener('statechange',changed);changed();
 });
 registration=await navigator.serviceWorker.ready;
 return registration;
}
async function prepare(){
 // Permission must be requested directly from the click, before network work.
 if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted'){log('denied');return;}
 log('preparing');await identity();await worker();
 const response=await fetch(PUSH_WORKER_URL+'/config',{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('config');
 const {vapidPublicKey}=await response.json();
 subscription=await registration.pushManager.getSubscription();
 if(!subscription){const base=vapidPublicKey.replace(/-/g,'+').replace(/_/g,'/');const key=Uint8Array.from(atob(base.padEnd(Math.ceil(base.length/4)*4,'=')),ch=>ch.charCodeAt(0));subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});}
 await api('/register',{subscription:subscription.toJSON(),language:lang});
 save('toe_device_notifications_v1',1); // Main app stores the same literal "1".
 ready=true;log('connected');await refresh();
}
async function refresh(){
 if(!subscription)return;
 const result=await api('/test-status',{endpoint:subscription.endpoint});tests=result.tests;
 try{const cache=await caches.open('sbp-push-test-results');receipts={};
 for(const item of tests){const response=await cache.match(new URL('./__push-test/'+item.id,location.href).href);if(response)receipts[item.id]=await response.json();}}catch{}
 render();
}
async function run(fn){
 if(busy)return;busy=true;render();
 try{await fn();}catch(error){log(error.status===429?'rate':error.status===403?'subscription':error.status===401?'auth':'error');}
 finally{busy=false;render();}
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;installStatus='installed';render();});
$('install').onclick=async()=>{
 if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice;}catch{}}
 else{$('install-help').open=true;installStatus=isAndroid()?'androidManualInstall':'manualInstall';}
 render();
};
$('copy-link').onclick=async()=>{
 try{await navigator.clipboard.writeText('https://sbp-information.github.io/notification-test.html');installStatus='copied';}
 catch{installStatus='copyFailed';}
 render();
};
$('prepare').onclick=()=>run(prepare);
$('local').onclick=()=>run(async()=>{await registration.showNotification(t('localTitle'),{body:t('localBody'),icon:'./sbp-icon-192.png',tag:'sbp-local-test',data:{kind:'test'}});log('localShown');});
async function send(delay){
 const result=await api('/test',{endpoint:subscription.endpoint,delay});
 log(result.test.state==='sent'?'sent':'queued');await refresh();
}
$('immediate').onclick=()=>run(()=>send(0));
$('delayed').onclick=()=>run(()=>send(60));
$('refresh').onclick=()=>run(async()=>{await refresh();log('refreshDone');});
$('clear').onclick=()=>{logs=[];feedback='';save('sbp_test_log',logs);render();};
$('language').onclick=()=>{lang=lang==='ru'?'kz':'ru';save('sbp_test_language',lang);render();if(ready)run(()=>api('/register',{subscription:subscription.toJSON(),language:lang}));};
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.kind==='test'||event.data?.type==='test-refresh')run(async()=>{await refresh();log('received');});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready)run(refresh);});
setInterval(()=>{if(!document.hidden&&ready&&!busy)run(refresh);},10000);
render();
// Reuse an existing account and subscription; never prompt on page load.
if(supported())worker().catch(()=>{});
if(supported()&&Notification.permission==='granted')run(async()=>{
 await identity();await worker();subscription=await registration.pushManager.getSubscription();
 if(subscription){try{await refresh();ready=true;}catch(error){if(error.status!==403)throw error;}}
});
