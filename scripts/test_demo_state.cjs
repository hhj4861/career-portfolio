/* Lightweight DOM simulation: validates state transitions only.
 * Run: node scripts/test_demo_state.cjs
 * Real keyboard behavior and responsive layout require test_demo.cjs in a browser.
 * The current executor blocks Chromium process sockets, so that browser suite
 * must run in an environment where Chromium is permitted.
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this._text='';this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.parentNode=null;this.classList={toggle:(name,yes)=>{let c=new Set(this.className.split(/\s+/).filter(Boolean));if(yes)c.add(name);else c.delete(name);this.className=[...c].join(' ')}}}
  set id(v){this.attrs.id=v} get id(){return this.attrs.id||''}
  set className(v){this.attrs.class=v} get className(){return this.attrs.class||''}
  set textContent(v){this._text=String(v);this.children=[]} get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}
  append(...els){for(const el of els){el.parentNode=this;this.children.push(el)}}
  replaceChildren(...els){this.children=[];this._text='';this.append(...els)}
  setAttribute(k,v){v=String(v);this.attrs[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v; if(k==='hidden')this.hidden=true;if(k==='disabled')this.disabled=true;}
  getAttribute(k){if(k.startsWith('data-'))return this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]??null;return this.attrs[k]??null}
  removeAttribute(k){delete this.attrs[k]}
  matches(s){if(s[0]==='#')return this.id===s.slice(1);if(s[0]==='.')return this.className.split(/\s+/).includes(s.slice(1));if(s[0]==='['){const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m&&(m[2]===undefined?this.getAttribute(m[1])!==null:this.getAttribute(m[1])===m[2])}return this.tagName===s}
  querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)])}
  querySelector(s){return this.querySelectorAll(s)[0]||null}
  closest(s){return this.matches(s)?this:this.parentNode?.closest(s)||null}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  dispatch(type,target=this){for(const fn of this.listeners[type]||[])fn({target});this.parentNode?.dispatch(type,target)}
  click(){if(!this.disabled)this.dispatch('click')}
}
const document=new Element('document');document.createElement=t=>new Element(t);document.getElementById=id=>document.querySelector('#'+id);
const source=fs.readFileSync(path.join(ROOT,'templates/demo.html'),'utf8');
let stack=[document];for(const match of source.matchAll(/<\/?[A-Za-z][^>]*>|[^<]+/g)){const token=match[0];if(token.startsWith('</')){stack.pop();continue}if(token.startsWith('<')){const tag=token.match(/^<([^\s>]+)/)[1];const el=new Element(tag);for(const attr of token.slice(tag.length+1,-1).matchAll(/([^\s=]+)(?:="([^"]*)")?/g))el.setAttribute(attr[1],attr[2]??'');stack.at(-1).append(el);if(!['input','br','hr','meta','link'].includes(tag))stack.push(el)}else{stack.at(-1)._text+=token}}
let timers=new Map(),seq=0;const flush=()=>{const c=[...timers.values()];timers.clear();c.forEach(fn=>fn())};
const sandbox={document,console,setTimeout:fn=>{timers.set(++seq,fn);return seq},clearTimeout:id=>timers.delete(id)};
vm.runInNewContext(fs.readFileSync(path.join(ROOT,'demo.js'),'utf8'),sandbox);
const el=x=>document.getElementById('demo-'+x);const select=(e,v)=>{assert(!e.disabled);e.value=v;e.dispatch('change')};const click=e=>e.click();const check=e=>{assert(!e.disabled);e.checked=true;e.dispatch('change')};const analyze=()=>{click(el('analyze'));flush()};const qs=()=>el('questions').querySelectorAll('.demo-question');const answer=(i,v)=>select(qs()[i].querySelector('[data-action="answer"]'),v);const evidence=i=>{const q=qs()[i];click(q.querySelector('[data-action="toggle-evidence"]'));check(q.querySelector('[data-action="check-evidence"]'))};let count=0;const test=(c,msg)=>{assert(c,msg);count++;console.log('PASS',msg)};
test(el('unresolved').textContent==='—','initial state');analyze();test(qs().length===2&&el('unresolved').textContent==='2개','two questions after analysis');test(el('approve').disabled&&el('approval-state').textContent==='대기','analysis not approval');answer(0,'partial');analyze();test(el('unresolved').textContent==='2개'&&qs()[0].querySelector('select').value==='partial','reanalysis preserves incomplete answers');answer(0,'complete');evidence(0);analyze();test(el('unresolved').textContent==='1개'&&el('evidence-count').textContent==='1 / 2','reanalysis preserves evidence');select(el('scenario'),'not-null');test(qs().length===0,'isolated scenario');analyze();select(el('scenario'),'index');test(el('unresolved').textContent==='1개'&&el('evidence-count').textContent==='1 / 2','restores scenario state');answer(1,'complete');evidence(1);test(el('approve').disabled,'acknowledgement required');check(el('acknowledge'));test(!el('approve').disabled,'explicit acknowledgement enables approval');click(el('approve'));test(el('approval-state').textContent==='승인됨'&&el('approve').disabled,'approval gated and nonrepeatable');analyze();test(el('approval-state').textContent==='대기'&&!el('acknowledge').checked&&el('evidence-count').textContent==='2 / 2','reanalysis revokes approval only');check(el('acknowledge'));click(el('approve'));answer(0,'partial');test(el('approval-state').textContent==='대기'&&el('evidence-count').textContent==='1 / 2','answer change invalidates evidence and approval');click(el('analyze'));click(el('reset'));flush();test(qs().length===0&&el('unresolved').textContent==='—','reset cancels active analysis');click(el('analyze'));select(el('scenario'),'drop-column');flush();test(qs().length===0&&el('ddl').textContent.includes('DROP COLUMN'),'switch cancels active analysis');click(el('analyze'));click(el('analyze'));click(el('analyze'));flush();test(el('analysis-badge').textContent==='분석 완료 · 1회'&&qs().length===2,'repeat-click safe');select(el('scenario'),'not-null');test(el('analysis-badge').textContent==='분석 완료 · 1회','other scenario unaffected by reset');for(const s of ['index','not-null','drop-column']){select(el('scenario'),s);if(!qs().length)analyze();for(let i=0;i<2;i++){answer(i,'complete');evidence(i)}check(el('acknowledge'));click(el('approve'));test(el('approval-state').textContent==='승인됨',`${s} full flow`)}
const before=el('analyze').listeners.click.length;vm.runInNewContext(fs.readFileSync(path.join(ROOT,'demo.js'),'utf8'),sandbox);test(el('analyze').listeners.click.length===before,'script double initialization protected');test(el('feedback').getAttribute('aria-live')==='polite','live status attribute');console.log(`PASS: ${count} DOM simulation checks; layout and actual browser behavior are not covered`);
