'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html'),app=read('app.js'),css=read('style.css');
test('Group Data is initially hidden for unauthenticated visitors',()=>{
  assert.match(html,/<details class="settings-reference-card hidden" id="settings-group-section" hidden>/);
  assert.match(css,/\.settings-reference-card\.hidden\{display:none\s*!important\}/);
  assert.match(html,/<details class="settings-reference-card" id="settings-display-section">/);
  assert.match(html,/<details class="settings-reference-card" id="settings-admins-section">/);
  assert.match(html,/<details class="settings-reference-card" id="settings-notifications-section">/);
});
test('Group Data visibility follows groupInfo permission and closes on revocation',()=>{
  const start=app.indexOf('function syncGroupSettingsVisibility() {');
  const end=app.indexOf('function loadGroupInfoToAdminForm() {',start);
  assert.ok(start!==-1 && end>start,'permission guard must be available');
  const source=app.slice(start,end);
  const tokens=new Set(['hidden']);
  const groupSection={
    hidden:true,
    open:false,
    classList:{
      toggle(name,blocked){assert.equal(name,'hidden');if(blocked)tokens.add(name);else tokens.delete(name);}
    }
  };
  const doc={getElementById:id=>{assert.equal(id,'settings-group-section');return groupSection;}};
  let allowed=false;
  const update=new Function('document','canEditGroupInfo',source+';return syncGroupSettingsVisibility;')(doc,()=>allowed);
  assert.equal(update(),false,'regular users must not see the section');
  assert.equal(groupSection.hidden,true);assert.equal(tokens.has('hidden'),true);
  allowed=true;
  assert.equal(update(),true,'authorized editors must be able to see the section');
  assert.equal(groupSection.hidden,false);assert.equal(tokens.has('hidden'),false);
  groupSection.open=true;
  allowed=false;
  assert.equal(update(),false,'revoked admin rights should hide the section');
  assert.equal(groupSection.hidden,true);
  assert.equal(groupSection.open,false,'previously expanded group section must close');
  assert.equal(tokens.has('hidden'),true);
});
test('Settings opening and permission refresh both apply visibility, direct access is gated',()=>{
  assert.match(app,/function loadGroupInfoToAdminForm\(\)\s*\{\s*const allowed = syncGroupSettingsVisibility\(\)/);
  const open=app.slice(app.indexOf('window.openAdminSettings = function() {'),app.indexOf('window.closeAdminSettings = function() {'));
  assert.match(open,/loadGroupInfoToAdminForm\(\)/);
  const refresh=app.slice(app.indexOf('function updateAdminUI() {'),app.indexOf('function updateAdminUI() {')+6000);
  assert.match(refresh,/loadGroupInfoToAdminForm\(\)/);
  const shortcut=app.slice(app.indexOf('window.openGroupSettings = function() {'),app.indexOf('function refreshSettingsSystem()'));
  assert.match(shortcut,/if \(!canEditGroupInfo\(\)\) return;/);
  assert.match(app,/function canEditGroupInfo\(\)\s*\{\s*return !!getPermissionsForLogin\(\)\.groupInfo;/);
  assert.match(app,/if \(fields\) fields.disabled = !allowed \|\| groupSettingsSaving/);
});
test('release information is bilingual and other group displays remain available',()=>{
  const releases=read('release-data.js');
  const entry=releases.slice(releases.indexOf("version:'19.25'"),releases.indexOf("version:'19.24'"));
  assert.match(entry,/ru:\[/);assert.match(entry,/kz:\[/);
  assert.match(html,/<h1 id="group-name"/);
  assert.match(html,/id="roster-group-name"/);
});
