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
check(releaseCheck('ready').ready,'prepared development ticket passes');
check(!releaseCheck('missing').ready,'missing development ticket blocks DCR');
check(!releaseCheck('incomplete').ready,'missing control information blocks DCR');
console.log(`PASS: ${checks} policy checks`);
