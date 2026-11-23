// State regression test only; rendering is stubbed. Not an iPad/browser test.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname, 'app.js'),'utf8').replace('  load();','  window.test = { onClick, onChange, go };\n  load();').replace('  function render(focusTitle) {','  function render(focusTitle) { return;');
const ctx={window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null}},localStorage:{getItem(){return null},setItem(){}}};vm.runInNewContext(src,ctx);
const s=ctx.window.StudioPreview.state,t=ctx.window.test;
const click=act=>t.onClick({target:{closest:()=>({dataset:{act},matches:()=>false})}});
const pick=id=>t.onChange({target:{dataset:{libraryImage:id}}});
s.page='content';s.content='newsletter';s.newsletter.checkedHash='approved';s.newsletter.mailchimp={test:true};
t.go('library');pick('b2');assert.equal(s.newsletter.current.imageId,'b1');assert.equal(s.newsletter.checkedHash,'approved');assert.equal(s.newsletter.mailchimp.test,true);
click('cancel-library');assert.equal(s.page,'content');assert.equal(s.newsletter.current.imageId,'b1');
t.go('library');click('use-image');assert.equal(s.page,'library');assert.equal(s.newsletter.current.imageId,'b1');
pick('b3');click('use-image');assert.equal(s.page,'content');assert.equal(s.newsletter.current.imageId,'b3');assert.equal(s.newsletter.checkedHash,'');assert.equal(s.newsletter.mailchimp,null);
t.go('library');pick('b2');t.go('home');t.go('library');click('use-image');assert.equal(s.newsletter.current.imageId,'b3');
console.log('PASS: tentative selection, cancel, empty selection guard, explicit apply, approval invalidation, stale selection reset.');
