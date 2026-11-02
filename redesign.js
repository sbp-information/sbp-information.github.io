const labels={
 ru:{theme:'Тема оформления',themeHint:'Выберите удобный внешний вид',light:'Светлая',dark:'Тёмная',system:'Как на устройстве',language:'Язык',menu:'Меню',group:'Группа',home:'Главная',settings:'Настройки',notifications:'Уведомления'},
 kz:{theme:'Безендіру тақырыбы',themeHint:'Ыңғайлы көріністі таңдаңыз',light:'Ашық',dark:'Қараңғы',system:'Құрылғыдағыдай',language:'Тіл',menu:'Мәзір',group:'Топ',home:'Басты бет',settings:'Баптаулар',notifications:'Хабарландырулар'}
};
export function resolvedTheme(value,systemDark=false){return value==='dark'||(value==='system'&&systemDark)?'dark':'light';}
export function redesignLabels(lang='ru'){return labels[lang==='kz'?'kz':'ru'];}
export function initRedesign(){
 const read=(key,fallback)=>{try{return window.localStorage.getItem(key)||fallback;}catch(_){return fallback;}};
 const lang=()=>read('toe_ui_language','ru')==='kz'?'kz':'ru';
 const query=window.matchMedia?.('(prefers-color-scheme: dark)');
 let selected=read('sbp_design_theme','system');
 if(!['light','dark','system'].includes(selected))selected='system';
 const choice=()=>selected;
 function applyTheme(){
  const theme=resolvedTheme(choice(),query?.matches);
  const root=document.documentElement;
  if(root.dataset.sbpTheme!==theme)root.dataset.sbpTheme=theme;
  if(root.style.colorScheme!==theme)root.style.colorScheme=theme;
  const meta=document.querySelector('meta[name="theme-color"]');
  const themeColor=theme==='dark'?'#121416':'#f6fbfd';
  if(meta?.getAttribute('content')!==themeColor)meta?.setAttribute('content',themeColor);
  document.querySelectorAll('button[data-sbp-theme]').forEach(button=>{
    const pressed=String(button.dataset.sbpTheme===choice());
    if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);
  });
 }
 function refresh(){
  const w=redesignLabels(lang());document.querySelectorAll('[data-sbp-text]').forEach(n=>{if(w[n.dataset.sbpText])n.textContent=w[n.dataset.sbpText];});
  document.querySelectorAll('[data-sbp-aria]').forEach(n=>{if(w[n.dataset.sbpAria])n.setAttribute('aria-label',w[n.dataset.sbpAria]);});
  document.querySelectorAll('[data-sbp-lang]').forEach(n=>{n.setAttribute('aria-pressed',String(n.dataset.sbpLang===lang()));});
  document.querySelectorAll('.sbp-language').forEach(n=>n.setAttribute('aria-label',w.language));
  applyTheme();
 }
 window.setSBPTheme=value=>{if(!['light','dark','system'].includes(value))return;selected=value;try{window.localStorage.setItem('sbp_design_theme',value);}catch(_){}applyTheme();};
 window.refreshRedesign=refresh;
 document.querySelectorAll('button[data-sbp-theme]').forEach(b=>b.addEventListener('click',()=>window.setSBPTheme(b.dataset.sbpTheme)));
 document.querySelectorAll('[data-sbp-lang]').forEach(b=>b.addEventListener('click',()=>window.setInterfaceLanguage(b.dataset.sbpLang)));
 if(query?.addEventListener)query.addEventListener('change',applyTheme);else query?.addListener?.(applyTheme);
 window.addEventListener?.('storage',event=>{if(event.key!=='sbp_design_theme'&&event.key!==null)return;selected=read('sbp_design_theme','system');if(!['light','dark','system'].includes(selected))selected='system';applyTheme();});refresh();
}
