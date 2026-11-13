// Narrow state checks; deliberately not a substitute for a browser test.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{style:{},innerHTML:'',textContent:'',className:'',value:'',disabled:true,focus(){}});return elements.get(id)};
const storage=new Map();const ctx=vm.createContext({document:{getElementById:el,querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{scrollTo(){},addEventListener(){}},setTimeout:()=>0,clearTimeout(){}});
vm.runInContext(script,ctx);const run=s=>vm.runInContext(s,ctx);
assert.equal(run('selected().length'),4);assert.equal(run('ready().length'),3);
run('selectContact(4,false);startMail();nextStep(2)');assert.equal(run('state.selected.length'),3);
run("update('subject','Geprüfter Betreff');nextStep(3)");assert.equal(run('state.subject'),'Geprüfter Betreff');
run('nextStep(4);plan()');assert.equal(run('state.planned'),false);
run('consent=true;plan()');assert.equal(run('state.planned'),true);
run("update('body','Neuer Text')");assert.equal(run('state.planned'),false);assert.equal(run('consent'),false);
run('state.selected=[];state.step=1;nextStep(2)');assert.equal(run('state.step'),1);
run("editContent('contentTitle','Neue Headline')");assert.equal(el('preview-title').textContent,'Neue Headline');run('undo()');assert.equal(run('state.contentTitle'),'Sichtbarkeit, die bleibt.');
assert.ok(storage.has('studioone-v2-review-1'));assert.ok(!/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(script));
console.log('PASS: syntax, selection, partial eligibility, step gates, approval, invalidation, preview, undo, storage, no network client. Browser layout unverified.');

run("state.step=3;go('home');resumeMail()");
assert.equal(run('state.step'),3);
run("localStorage.setItem=()=>{throw Error('quota')};update('subject','Ungesichert')");
assert.equal(run('persistent'),false);
assert.match(el('storage-status').textContent,/Nicht gespeichert/);
assert.equal(run('state.subject'),'Ungesichert');
run("localStorage.setItem=(k,v)=>{};retrySave()");
assert.equal(run('persistent'),true);
console.log('PASS: resume preserves step; storage failure visible; current text retained; retry clears failure.');
