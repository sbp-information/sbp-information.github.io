const labels={
 ru:{language:'Язык',menu:'Меню',group:'Группа',home:'Главная',settings:'Настройки',notifications:'Уведомления'},
 kz:{language:'Тіл',menu:'Мәзір',group:'Топ',home:'Басты бет',settings:'Баптаулар',notifications:'Хабарландырулар'}
};
export function resolvedTheme(systemDark=false){return systemDark===true?'dark':'light';}
export function redesignLabels(lang='ru'){return labels[lang==='kz'?'kz':'ru'];}
export function initRedesign(){
 const read=(key,fallback)=>{try{return window.localStorage.getItem(key)||fallback;}catch(_){return fallback;}};
 const lang=()=>read('toe_ui_language','ru')==='kz'?'kz':'ru';
 const query=window.matchMedia?.('(prefers-color-scheme: dark)');
 function applyTheme(){
  const theme=resolvedTheme(query?.matches===true);
  const root=document.documentElement;
  if(root.dataset.sbpTheme!==theme)root.dataset.sbpTheme=theme;
  // Browser-native controls and scrollbars follow the operating system too.
  if(root.style.colorScheme!=='light dark')root.style.colorScheme='light dark';
  const meta=document.querySelector('meta[name="theme-color"]');
  const themeColor=theme==='dark'?'#0b0f18':'#f6fbfd';
  if(meta?.getAttribute('content')!==themeColor)meta?.setAttribute('content',themeColor);
 }
 function refresh(){
  const w=redesignLabels(lang());document.querySelectorAll('[data-sbp-text]').forEach(n=>{if(w[n.dataset.sbpText])n.textContent=w[n.dataset.sbpText];});
  document.querySelectorAll('[data-sbp-aria]').forEach(n=>{if(w[n.dataset.sbpAria])n.setAttribute('aria-label',w[n.dataset.sbpAria]);});
  document.querySelectorAll('[data-sbp-lang]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.sbpLang===lang())));
  document.querySelectorAll('.sbp-language').forEach(n=>n.setAttribute('aria-label',w.language));
  applyTheme();
 }
 window.refreshRedesign=refresh;
 document.querySelectorAll('[data-sbp-lang]').forEach(b=>b.addEventListener('click',()=>window.setInterfaceLanguage(b.dataset.sbpLang)));
 if(query?.addEventListener)query.addEventListener('change',applyTheme);else query?.addListener?.(applyTheme);
 refresh();
}
