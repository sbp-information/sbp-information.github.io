const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname.replace(/^\//,'')||'index.html');try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(4173,'127.0.0.1',r));const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}),headless:true});try{
for(const width of [320,390,1440]) {
 const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('toe_ui_language','kz');localStorage.setItem('sbp_release_seen_19.30','1');localStorage.setItem('sbp_release_seen_19.31','1');});
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>typeof window.switchView==='function');
 for(const view of ['home','schedule','roster','college','tracker','settings','help','notifications','menu','editor','bells','pause','history']){
  const result=await page.evaluate(async view=>{
   // Only opens local UI; no save, send or publish actions are invoked.
   const open=()=>{if(view==='settings')window.openAdminSettings();else if(view==='help')window.openHelpNavigation();else if(view==='notifications')window.openNotifications();else if(view==='menu')window.openAppMenu();else if(view==='history')window.openReleaseHistory();else if(['editor','bells','pause'].includes(view)){
    sessionStorage.setItem('toe_can_schedule','1');if(view==='editor')window.openScheduleEditor(0);if(view==='bells')window.openScheduleBellEditor();if(view==='pause')window.openSchedulePauseEditor();
   }else window.switchView(view);};
   // Close previous overlays to measure the current one.
   for(const name of ['closeAdminSettings','closeHelpNavigation','closeNotifications','closeAppMenu','closeScheduleEditor','closeScheduleBellEditor','closeSchedulePauseEditor'])window[name]?.();
   window.setInterfaceLanguage('kz');open();if(view==='settings')document.querySelectorAll('#admin-settings-modal details').forEach(el=>el.open=true);await new Promise(r=>setTimeout(r,80));
   const values=[];
   if(view==='editor'){document.getElementById('edit-teacher').value='Негманова Г.Б.';document.getElementById('edit-change-note').value='Моя заметка / Менің жазбам';}
   const {KZ_EXACT}=await import('./i18n.js?v=20261101-localization-v1');
   for(const language of ['kz','ru','kz']){
    window.setInterfaceLanguage(language);await new Promise(r=>setTimeout(r,80));
    const wrong=language==='kz'?new Set(Object.keys(KZ_EXACT).filter(k=>KZ_EXACT[k]!==k)):new Set(Object.entries(KZ_EXACT).filter(([k,v])=>k!==v).map(([k,v])=>v));
    const leftovers=[],overflow=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){const n=walker.currentNode,e=n.parentElement,s=n.nodeValue.trim();if(!s||e.closest('script,style,[data-i18n-skip],textarea')||!e.getClientRects().length)continue;if(wrong.has(s))leftovers.push({text:s,at:e.id||e.className});}
    for(const e of document.querySelectorAll('button,label,h1,h2,h3,p,small,strong')){if(!e.getClientRects().length||!e.clientWidth)continue;const style=getComputedStyle(e);if(e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(style.overflowX))overflow.push({text:e.textContent.trim().slice(0,100),at:e.id||e.className,client:e.clientWidth,scroll:e.scrollWidth});}
    values.push({language,leftovers,overflow,pageOverflow:document.documentElement.scrollWidth>innerWidth});
   }
   if(view==='editor'&&(document.getElementById('edit-teacher').value!=='Негманова Г.Б.'||document.getElementById('edit-change-note').value!=='Моя заметка / Менің жазбам'))throw new Error('Draft changed');
   return values;
  },view);
  for(const item of result){assert.deepEqual(item.leftovers,[],view+' '+item.language);assert.deepEqual(item.overflow,[],view+' '+item.language);assert.equal(item.pageOverflow,false); }
  console.log(JSON.stringify({width,view,result}));
  if(process.env.QA_OUTPUT_DIR&&['home','settings','help','editor'].includes(view))await page.screenshot({path:path.join(process.env.QA_OUTPUT_DIR,`language-${view}-${width}.png`)});
 }
 console.log(JSON.stringify({width,errors}));assert.equal(errors.length,0);await page.close();
}
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
