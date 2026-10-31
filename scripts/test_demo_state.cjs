/* Pure policy checks; browser interactions are covered separately. */
const assert=require('node:assert/strict');
const {blank,dbResult,releaseCheck}=require('../demo.js');
let checks=0;
function check(value,message){assert(value,message);checks++;}
for(const kind of ['schema','dml','unknown','none']) {
  const state=blank();check(!dbResult(kind,state).ready,kind+': no result before review');state.runs=1;
  if(kind==='none'){check(dbResult(kind,state).type==='none'&&!dbResult(kind,state).ready,'no DB changes never fabricate PASS');continue;}
  if(kind==='unknown'){check(dbResult(kind,state).verdict==='미실행','unknown input never passes');state.sourceFixed=true;}
  check(dbResult(kind,state).verdict==='PASS'&&dbResult(kind,state).pending===1&&!dbResult(kind,state).ready,kind+': PASS alone is insufficient');
  state.answer='vague';check(!dbResult(kind,state).ready,'approval text is not a resolved answer');state.applied=true;check(dbResult(kind,state).ready,'only re-reviewed facts resolve requester');state.applied=false;check(!dbResult(kind,state).ready,'edited answers invalidate completion');
}
const r={repo:'checkout-api',date:'2026-11-03',note:'',linked:'missing'};
check(releaseCheck(r).checks.filter(c=>!c.ok).length===3,'missing fields, ticket and duplicate detected independently');
r.note='Test';r.linked='ready';check(!releaseCheck(r).ready,'valid required fields cannot bypass duplicate');r.repo='catalog-api';check(releaseCheck(r).ready,'distinct repository passes');r.date='';check(!releaseCheck(r).ready,'missing date never passes');
console.log(`PASS: ${checks} policy checks`);
