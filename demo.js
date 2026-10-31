/* Original portfolio simulation. Fictional fixtures, no network or persistent storage. */
(() => {
  'use strict';
  const fixtures = {
    schema: {file:'Member.java · 변경 전 → 후', input:'// 가상 JPA 매핑 변경\n// before: membershipLevel 없음\n// after:\n@Column(name = "membership_level",\n  nullable = false, columnDefinition = "INT DEFAULT 0")\nprivate Integer membershipLevel;',sql:'ALTER TABLE demo_member\n  ADD COLUMN membership_level INT NOT NULL DEFAULT 0;',question:'기존 회원에게 적용되는 기본값 0의 업무 의미는 무엇인가요?', fact:'가상 기획서: 기존 회원은 일반 등급이며, 0은 일반 등급을 뜻합니다.'},
    dml: {file:'change.sql',input:'-- 가상 예시 · 실행하지 않습니다\nUPDATE demo_coupon\nSET enabled = 0\nWHERE campaign_id = 42;',sql:'UPDATE demo_coupon SET enabled = 0\nWHERE campaign_id = 42;',question:'변경하려는 캠페인과 상태값의 기대값을 원천 업무 자료로 확인해 주세요.',fact:'가상 운영 요청서: 종료된 캠페인 42의 쿠폰을 비활성화하며, 비활성 코드는 0입니다.'},
    unknown: {file:'CouponRepository.java',input:'// 가상 예시 · 설정과 분기 정보 누락\nString sql = "UPDATE " + tableName\n  + " SET enabled = :state WHERE " + filter;',sql:'UPDATE demo_coupon SET enabled = 0\nWHERE campaign_id = 42;',question:'확정한 대상 캠페인과 상태값의 업무 근거가 필요합니다.',fact:'가상 운영 요청서: 종료된 캠페인 42의 쿠폰을 비활성화하며, 비활성 코드는 0입니다.'},
    none: {file:'docs/README.md',input:'- 빌드 안내\n+ 로컬 빌드·실행 안내\n\nDB 스키마·쿼리·설정 변경 없음',sql:'',question:'',fact:''}
  };
  const blank = () => ({runs:0,answer:'',applied:false,sourceFixed:false,next:0});
  function dbResult(kind,state) {
    if (!state.runs) return {verdict:'—',pending:null,ready:false,type:'idle'};
    if (kind==='none') return {verdict:'미실행',pending:0,ready:false,type:'none'};
    if (kind==='unknown'&&!state.sourceFixed) return {verdict:'미실행',pending:null,ready:false,type:'unknown'};
    return {verdict:'PASS',pending:state.applied?0:1,ready:state.applied,type:'review'};
  }
  function releaseCheck(linked){ return {ready:linked==='ready', message:linked==='missing'?'상위 개발 티켓을 PR에 연결하세요.':linked==='incomplete'?'개발 티켓의 필수 통제 정보를 보완하세요.':'개발 티켓과 필수 통제 정보를 확인했습니다.'}; }
  if(typeof module!=='undefined'&&module.exports) module.exports={blank,dbResult,releaseCheck};
  if(typeof document==='undefined') return;
  const root=document.getElementById('demo');
  if(!root||root.dataset.initialized==='true') return;
  root.dataset.initialized='true';
  const el=id=>root.querySelector('#'+id);
  const put=(id,text)=>{el(id).textContent=text;};
  const feedback=(id,text)=>{put(id,text);el(id).scrollIntoView({block:'nearest',behavior:'instant'});};
  const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const list=(id,items)=>el(id).replaceChildren(...items.map(s=>node('li',s)));
  const tabs=[...root.querySelectorAll('[data-tab]')];
  const activate=tab=>{tabs.forEach(t=>{const yes=t===tab;t.setAttribute('aria-selected',String(yes));t.tabIndex=yes?0:-1;el('panel-'+t.dataset.tab).hidden=!yes;});};
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(tab));
    tab.addEventListener('keydown',event=>{
      let target;
      if(event.key==='ArrowRight') target=tabs[(index+1)%tabs.length];
      if(event.key==='ArrowLeft') target=tabs[(index+tabs.length-1)%tabs.length];
      if(event.key==='Home') target=tabs[0];
      if(event.key==='End') target=tabs.at(-1);
      if(target){event.preventDefault();activate(target);target.focus();}
    });
  });
  document.querySelectorAll('[data-open-demo]').forEach(link=>link.addEventListener('click',()=>{const tab=tabs.find(t=>t.dataset.tab===link.dataset.openDemo);if(tab)activate(tab);}));
  const wizards = {};
  root.querySelectorAll('[data-wizard]').forEach(wizard=>{
    const panels=[...wizard.querySelectorAll('[data-step]')], buttons=[...wizard.querySelectorAll('[data-step-target]')];
    let active=0;
    function show(index){
      active=Math.max(0,Math.min(index,panels.length-1));
      panels.forEach((panel,i)=>{panel.hidden=i!==active;});
      buttons.forEach((button,i)=>{button.classList.toggle('is-current',i===active);if(i===active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
      wizard.querySelector('[data-step-prev]').disabled=active===0;
      wizard.querySelector('[data-step-next]').disabled=active===panels.length-1;
      wizard.querySelector('[data-step-progress]').textContent=`${active+1} / ${panels.length}`;
    }
    buttons.forEach((button,i)=>button.addEventListener('click',()=>show(i)));
    wizard.querySelector('[data-step-prev]').addEventListener('click',()=>show(active-1));
    wizard.querySelector('[data-step-next]').addEventListener('click',()=>show(active+1));
    wizards[wizard.dataset.wizard]=show;show(0);
  });
  const states={};
  const kind=()=>el('dbq-scenario').value;
  const mode=()=>el('dbq-mode').value;
  const key=()=>mode()+':'+kind();
  const current=()=>states[key()]??(states[key()]=blank());
  function renderDB() {
    const state=current(), f=fixtures[kind()], r=dbResult(kind(),state);
    const isPR=mode()==='pr', isDML=kind()==='dml'||kind()==='unknown';
    put('dbq-file',f.file);put('dbq-input',state.sourceFixed?f.sql+'\n-- 가상 소스 보완: 대상·조건·설정 명시':f.input);
    put('dbq-path-note',isPR?'PR: 변경 스냅샷 고정 → DB 변경 선체크 → SQL 도출 → Remote MCP 판정. 개발자 보고서와 DBA 보고서를 구분합니다.':'로컬: 사용자가 검수를 명시적으로 요청 → 변경 코드·SQL 확인 → Remote MCP 검수 → 필요한 업무 질문.');
    put('dbq-badge',r.type==='idle'?'검수 전':r.type==='unknown'?'소스 보완 필요':r.type==='none'?'DB 변경 없음':r.ready?'개발자 보완 완료':'업무 확인 필요');
    put('dbq-verdict',r.verdict);put('dbq-pending',r.pending===null?'—':r.pending+'건');put('dbq-dba',r.type==='review'?'1건 · 별도':'—');
    el('dbq-answer-panel').hidden=r.type!=='review';el('dbq-source-panel').hidden=r.type!=='unknown';el('dbq-next-panel').hidden=!r.ready;
    el('dbq-answer').value=state.answer;
    put('dbq-answer-help',f.fact+(isPR?'\n실제 PR에서는 /dbq-answer 댓글과 /dbq-recheck로 보완합니다.':'\n실제 로컬 검수에서는 같은 대화에서 업무 의미를 답합니다.'));
    if(r.type==='idle'){put('dbq-summary','입력과 경로를 선택한 뒤 검수를 시작하세요.');put('dbq-result','아직 도출한 SQL과 검수 결과가 없습니다.');}
    else if(r.type==='unknown'){put('dbq-summary','동적 SQL의 대상과 조건을 확정할 수 없습니다. DB 변경 없음이나 PASS로 바꾸지 않고 소스 보완을 요청합니다.');put('dbq-result','classification: unknown\n누락: tableName, filter, DB 설정\nSQL 생성·SSOT 판정 미실행');}
    else if(r.type==='none'){put('dbq-summary',isPR?'선체크에서 DB 변경이 없음을 확인했습니다. SQL 도출·SSOT 검수·후속 보고서 Job을 생략합니다.':'확인한 범위에 DB 변경이 없습니다. 원격 SQL 검수를 호출하지 않습니다.');put('dbq-result','classification: not_db\nscope: docs/README.md\nSQL·검수 ID 없음');}
    else {
      put('dbq-summary',r.ready?'재검수 예시에서 개발자 확인 사항이 해소되었습니다. DBA의 실행 전 확인은 별도로 남습니다.':f.question+'\nPASS여도 이 질문이 남아 있으므로 완료가 아닙니다.');
      put('dbq-result',f.sql+'\n\n[가상 코어 결과]\nverdict: PASS\nrequester: '+r.pending+'건\ndba_before_apply: 백업·복구·작업 영향 확인');
    }
    put('dbq-binding',r.type==='review'?`가상 검수 ID DEMO-${mode().toUpperCase()}-${kind()}-${state.runs} · SSOT demo-v1 · 재검수는 새 ID로 직전 결과를 연결합니다.`:'실제 검수 ID·서버 호출은 생성하지 않습니다.');
    put('dbq-run',state.runs?'같은 입력 다시 검수':'변경 검수 체험');
    put('dbq-next',isPR?(state.next?'PR 2차 결과 확인됨':'PR 2차 보고서 체험'):isDML?(state.next===0?'가상 티켓 미리보기':state.next===1?'이 가상 검수로 티켓 생성 동의':'가상 요청 생성됨'):'DDL 코딩 가이드 보기');
    el('dbq-next').disabled=state.next>=2||(!isDML&&state.next>0)||isPR&&state.next>0;
    put('dbq-next-result',state.next===0?'':isPR?'현재 입력을 2차 검수한 DBA용 보고서 예시입니다. DBA의 승인 전·실행 전 확인은 남아 있으며 SQL 실행이나 Jira 제출은 하지 않았습니다.':isDML?(state.next===1?'미리보기: 가상 DB demo_shop / 위 SQL / 현재 DEMO 검수 ID. 아래 버튼으로 이 검수의 생성에 동의할 수 있습니다.':'가상 티켓 DEMO-001 생성 상태입니다. 실제 Jira 요청·DBA 승인·SQL 실행은 없습니다.'):'코딩 가이드: 검수된 컬럼명·타입·nullable·기본값을 ORM과 마이그레이션에 일치시킵니다. 실제 구현 뒤 전체 SQL을 다시 추출해 새 검수를 요청합니다.');
  }
  ['dbq-mode','dbq-scenario'].forEach(id=>el(id).addEventListener('change',()=>{renderDB();put('dbq-status','예시를 전환했습니다. 각 경로·예시의 상태는 이 페이지 안에서 보존됩니다.');}));
  function runDB(){const s=current();s.runs++;s.applied=s.answer==='fact';s.next=0;renderDB();put('dbq-status',dbResult(kind(),s).ready?'재검수 결과: PASS · 개발자 확인 0건. DBA 승인·실행은 별도입니다.':s.answer==='vague'?'승인한다는 말은 업무 근거가 아닙니다. 필요한 업무 질문을 유지합니다.':'입력에 따른 가상 결과입니다. 미해결 항목과 다음 행동을 확인하세요.');}
  el('dbq-run').addEventListener('click',()=>{runDB();wizards.dbq(1);});el('dbq-rerun').addEventListener('click',runDB);
  el('dbq-answer').addEventListener('change',()=>{const s=current();s.answer=el('dbq-answer').value;s.applied=false;s.next=0;renderDB();put('dbq-status','답변이 바뀌었습니다. 이전 완료 상태를 사용하지 않으며 재검수가 필요합니다.');});
  el('dbq-source').addEventListener('click',()=>{const s=current();s.sourceFixed=true;s.runs=0;s.applied=false;s.next=0;renderDB();put('dbq-status','가상 소스·DB 설정을 보완했습니다. 변경된 입력으로 검수를 다시 시작하세요.');wizards.dbq(0);});
  el('dbq-next').addEventListener('click',()=>{if(!dbResult(kind(),current()).ready)return;current().next++;renderDB();put('dbq-status',el('dbq-next-result').textContent);});
  el('dbq-reset').addEventListener('click',()=>{states[key()]=blank();renderDB();put('dbq-status','현재 경로·예시만 초기화했습니다.');wizards.dbq(0);});
  renderDB();
  let release={pr:false,checked:false,dcr:false,notified:false,approved:false};
  function renderRelease(){
    el('release-check').disabled=!release.pr;el('release-create').disabled=!release.checked;
    el('release-approve').disabled=!release.notified||release.approved;
    list('release-results',[release.checked?'통과 · 개발 티켓과 필수 통제 정보 확인':release.pr?'검사 대기 · PR 연결 정보 확인 필요':'PR 생성 전']);
    put('release-dcr',release.dcr?'가상 DCR-DEMO-01 생성 · 개발 티켓과 PR 연결\n상태: '+(release.approved?'승인됨':'승인 대기'):'DCR 생성 전');
    put('release-notice',release.approved?'승인자 선택 완료 → 가상 Jira 승인 상태 전환':release.notified?'가상 Slack 승인 요청 전달 · 승인자 응답 대기':'승인 요청 전');
  }
  function resetRelease(){release={pr:false,checked:false,dcr:false,notified:false,approved:false};renderRelease();put('release-gate-result','확인 전');}
  el('release-linked').addEventListener('change',()=>{resetRelease();put('release-status','입력이 바뀌어 이전 PR과 승인 예시를 초기화했습니다.');});
  el('release-pr').addEventListener('click',()=>{resetRelease();release.pr=true;renderRelease();put('release-status','가상 PR을 생성했습니다. GitHub 검사 단계에서 확인하세요.');wizards.release(1);});
  el('release-check').addEventListener('click',()=>{const result=releaseCheck(el('release-linked').value);if(!result.ready){list('release-results',['보완 필요 · '+result.message]);put('release-status',result.message+' 이전 단계로 돌아가 보완하세요.');return;}release.checked=true;release.dcr=true;release.notified=true;renderRelease();wizards.release(2);feedback('release-status','GitHub 검사 통과 · 가상 DCR 생성과 승인 요청이 자동으로 이어졌습니다.');});
  el('release-create').addEventListener('click',()=>{if(!release.checked)return;renderRelease();put('release-status','가상 Slack 승인 요청을 전달했습니다. 승인자 응답을 기다립니다.');wizards.release(3);});
  el('release-approve').addEventListener('click',()=>{if(!release.notified)return;release.approved=true;renderRelease();put('release-status','승인자 선택을 처리해 가상 Jira 승인 상태로 전환했습니다.');wizards.release(4);});
  el('release-gate').addEventListener('click',()=>{put('release-gate-result',release.approved?'통과 · 가상 배포 범위의 DCR 승인 확인\n실제 배포는 실행하지 않습니다.':'차단 · 가상 DCR 승인 정보가 없습니다.');put('release-status',release.approved?'가상 배포 게이트 통과.':'승인 전이므로 가상 배포를 차단했습니다.');});
  el('release-reset').addEventListener('click',()=>{el('release-linked').value='ready';resetRelease();put('release-status','가상 예시를 처음부터 시작합니다.');wizards.release(0);});renderRelease();
  const events=[
    {service:'checkout-api',trace:'trace-order',span:'span-01',message:'결제 요청',level:'info',raw:'[checkout-api] INFO 결제 요청 | traceId=trace-order spanId=span-01'},
    {service:'search-api',trace:'trace-search',span:'span-02',message:'상품 검색 완료',level:'info',raw:'service=search-api severity=INFO trace=trace-search span=span-02 msg="상품 검색 완료"'},
    {service:'payment-api',trace:'trace-order',span:'span-03',message:'결제 제공자 응답 시간 초과',level:'error',raw:'{"svc":"payment-api","lvl":"ERROR","trace_id":"trace-order","span_id":"span-03","msg":"결제 제공자 응답 시간 초과"}'}
  ];
  function renderLogs(){
    const trace=el('logs-trace').value, standardized=el('logs-format').value==='ecs';
    const selected=events.filter(e=>trace==='all'||e.trace===trace);
    put('logs-before',events.map(e=>e.raw).join('\n\n'));
    put('logs-count',`이벤트 ${selected.length}건`);
    put('logs-output',selected.map(e=>standardized?JSON.stringify({'service.name':e.service,'trace.id':e.trace,'span.id':e.span,'log.level':e.level,message:e.message},null,2):e.raw).join('\n\n'));
    put('logs-explanation',trace==='trace-order'?'주문 서비스와 결제 서비스의 두 이벤트가 같은 요청입니다. 결제 서비스에서 응답 시간 초과가 발생한 흐름을 볼 수 있습니다.':trace==='trace-search'?'검색 요청은 trace-search로 별도 처리되었고 예시 로그에는 오류가 없습니다.':'서로 다른 요청이 섞여 있습니다. 주문 요청을 선택해 같은 trace.id를 가진 이벤트를 모아 보세요.');
    put('logs-error',trace==='trace-search'?'선택한 검색 요청에는 오류 응답이 없습니다.':el('logs-protocol').value==='rest'?'주문 요청의 예시 응답 · HTTP 504\n{"error":{"code":504,"status":"DEADLINE_EXCEEDED",\n "message":"결제 제공자 응답 시간 초과"}}':'주문 요청의 예시 응답 · gRPC status: DEADLINE_EXCEEDED (4)\nmessage: 결제 제공자 응답 시간 초과');
    put('logs-status',`${standardized?'공통 형식':'서비스별 형식'} · ${trace==='all'?'전체 요청':trace} · 이벤트 ${selected.length}건. 가상 데이터입니다.`);
  }
  ['logs-trace','logs-format','logs-protocol'].forEach(id=>el(id).addEventListener('change',renderLogs));
  el('logs-apply').addEventListener('click',()=>{el('logs-format').value='ecs';renderLogs();wizards.logs(2);});
  el('logs-reset').addEventListener('click',()=>{el('logs-trace').value='all';el('logs-format').value='raw';el('logs-protocol').value='rest';renderLogs();wizards.logs(0);});renderLogs();
  root.querySelector('[data-demo-app]').hidden=false;
})();
