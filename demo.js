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
  function releaseCheck(request) {
    const checks=[
      {ok:!!request.note.trim()&&!!request.date,label:'필수값',detail:'변경 내용과 배포 예정일을 입력하세요.'},
      {ok:request.linked==='ready',label:'작업 티켓',detail:request.linked==='missing'?'작업 티켓 연결이 필요합니다.':'연결된 티켓이 배포 준비 상태여야 합니다.'},
      {ok:!(request.repo==='checkout-api'&&request.date==='2026-11-03'),label:'중복 요청',detail:'같은 저장소·날짜의 가상 요청 REL-DEMO-01이 있습니다. 일정을 조율하세요.'}
    ];
    return {checks,ready:checks.every(c=>c.ok)};
  }
  function qaGate(state) { return state.generated && state.reviewed && state.readyApproved && (state.fixedApproved || state.excluded); }
  if(typeof module!=='undefined'&&module.exports) module.exports={blank,dbResult,releaseCheck,qaGate};
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
  el('dbq-run').addEventListener('click',runDB);el('dbq-rerun').addEventListener('click',runDB);
  el('dbq-answer').addEventListener('change',()=>{const s=current();s.answer=el('dbq-answer').value;s.applied=false;s.next=0;renderDB();put('dbq-status','답변이 바뀌었습니다. 이전 완료 상태를 사용하지 않으며 재검수가 필요합니다.');});
  el('dbq-source').addEventListener('click',()=>{const s=current();s.sourceFixed=true;s.runs=0;s.applied=false;s.next=0;renderDB();put('dbq-status','가상 소스·DB 설정을 보완했습니다. 변경된 입력으로 검수를 다시 시작하세요.');});
  el('dbq-next').addEventListener('click',()=>{if(!dbResult(kind(),current()).ready)return;current().next++;renderDB();put('dbq-status',el('dbq-next-result').textContent);});
  el('dbq-reset').addEventListener('click',()=>{states[key()]=blank();renderDB();put('dbq-status','현재 경로·예시만 초기화했습니다.');});
  renderDB();
  const newQA=()=>({interview:'',generated:false,reviewed:false,fixed:false,evidence:false,readyApproved:false,fixedApproved:false,excluded:false,confirmed:false,ran:false,retried:false});
  let qa=newQA();
  const qaSay=message=>feedback('qa-status',message);
  function renderQA(){
    el('qa-generate').disabled=qa.generated;el('qa-record').disabled=qa.generated;el('qa-interview').disabled=qa.generated;
    el('qa-review').disabled=!qa.generated||qa.reviewed;
    el('qa-actions').hidden=!qa.reviewed||qa.confirmed;
    el('qa-execution').hidden=!qa.confirmed;
    el('qa-approve-ready').disabled=qa.readyApproved;
    el('qa-fix').disabled=qa.fixed||qa.excluded;
    el('qa-evidence').disabled=!qa.fixed||qa.excluded||qa.fixedApproved;
    el('qa-evidence').checked=qa.evidence;
    el('qa-approve-fixed').disabled=!qa.fixed||!qa.evidence||qa.excluded||qa.fixedApproved;
    el('qa-exclude').disabled=qa.excluded||qa.fixedApproved;
    el('qa-confirm').disabled=!qaGate(qa);
    el('qa-retry').disabled=!qa.ran||qa.retried||qa.excluded;
    put('qa-interview-state',qa.interview==='fact'?'가상 정책 자료를 확인했다고 기록했습니다. TC 근거는 카드 리뷰에서 별도로 확증합니다.':qa.interview==='unknown'?'모름으로 기록했습니다. 업무 사실을 임의로 채우지 않습니다.':'인터뷰를 건너뛰어도 TC 생성이 가능합니다.');
    const pending=[!qa.readyApproved?'TC 1 승인':null,!(qa.fixedApproved||qa.excluded)?'TC 2 보완·확증·승인 또는 제외':null].filter(Boolean);
    put('qa-gate-hint',pending.length?'남은 작업: '+pending.join(' · '):'카드 검토 완료. ‘리뷰 확정’을 누르세요.');
    put('qa-review-result',!qa.generated?'TC 생성 전':!qa.reviewed?'가상 문서·코드에서 초안 2개 생성 · 카드 리뷰를 열어 주세요':qa.confirmed?`리뷰 확정 · 실행 대상 ${qa.excluded?1:2}개${qa.excluded?' · 미완성 1개 제외':''}`:'카드별 상태를 확인하고 검토하세요.');
    const cards=el('qa-cases');cards.replaceChildren();
    if(!qa.generated){cards.append(node('p','아직 생성된 TC가 없습니다.'));}
    else {
      const a=node('article','');a.className='qa-case';a.append(node('strong',`TC 1 · 구독 취소 완료 ${qa.readyApproved?'✓ 승인':'· 리뷰 필요'}`),node('p','조건: 활성 구독 · 동작: 취소 확인 · 기대: 취소 완료가 표시된다.'));
      const b=node('article','');b.className='qa-case';b.append(node('strong',`TC 2 · 취소 시 환불 안내 ${qa.excluded?'· 이번 실행 제외':qa.fixedApproved?'✓ 승인':'· 보완 필요'}`),node('p',qa.fixed?'기대: 정책에 따른 환불 안내가 표시된다.':'기대 결과: 미작성 · 실행 가능한 기대 결과가 필요합니다.'),node('p',qa.evidence?'근거: 사용자가 가상 정책 자료를 확인했습니다.':'근거: 미확인 · AI 보완만으로 확증되지 않습니다.'));
      cards.append(a,b);
    }
    const runner=({web:'웹 / Playwright',android:'Android / Appium',ios:'iOS / 모바일 자동화'})[el('qa-target').value];
    put('qa-output',!qa.confirmed?'리뷰 확정 후 실행할 수 있습니다.':!qa.ran?`실행 준비 · ${runner} · 확정 TC ${qa.excluded?1:2}개`:`${runner} · 가상 결과\nTC 1 PASS · 취소 완료 확인${qa.excluded?'\nTC 2 제외 · 검토 미완성':qa.retried?'\nTC 2 PASS · 재실행에서 환불 안내 확인\n이전 실행: TC 2 FAIL · 기대한 안내 미표시':'\nTC 2 FAIL · 기대한 환불 안내 미표시'}\n\n리포트: ${qa.excluded?'PASS 1 · 제외 1':qa.retried?'PASS 2 · 이전 실패 이력 보존':'PASS 1 · FAIL 1'}\n실제 서비스 전송 없음`);
  }
  el('qa-record').addEventListener('click',()=>{if(qa.generated){qaSay('이미 생성한 초안은 유지됩니다. 답변을 바꾸려면 프로젝트를 초기화하세요.');return;}qa.interview=el('qa-interview').value;renderQA();qaSay(qa.interview==='unknown'?'모름을 기록했습니다. 미확인 정보는 추측하지 않고 ‘TC 초안 생성’으로 진행할 수 있습니다.':'가상 답변을 기록했습니다. 다음으로 ‘TC 초안 생성’을 누르세요.');});
  el('qa-generate').addEventListener('click',()=>{qa={...newQA(),interview:qa.interview,generated:true};renderQA();qaSay('가상 문서·코드로 TC 2개를 생성했습니다. 다음으로 ‘카드 리뷰 열기’를 누르세요.');});
  el('qa-review').addEventListener('click',()=>{qa.reviewed=true;renderQA();qaSay('TC 1을 승인하고, TC 2는 보완·근거 확증 후 승인하거나 실행에서 제외하세요.');});
  el('qa-approve-ready').addEventListener('click',()=>{qa.readyApproved=true;renderQA();qaSay('TC 1을 승인했습니다. TC 2의 근거와 기대 결과를 확인하세요.');});
  el('qa-fix').addEventListener('click',()=>{qa.fixed=true;qa.evidence=false;qa.fixedApproved=false;renderQA();qaSay('가상 보완 제안을 적용했습니다. 기대 결과를 채워도 근거는 미확인입니다. 자료를 읽고 직접 확증하세요.');});
  el('qa-evidence').addEventListener('change',()=>{qa.evidence=el('qa-evidence').checked;qa.fixedApproved=false;renderQA();qaSay(qa.evidence?'가상 정책 자료를 직접 확인했습니다. ‘TC 2 승인’을 누르세요.':'근거 확증을 취소했습니다. TC 2 승인은 다시 필요합니다.');});
  el('qa-approve-fixed').addEventListener('click',()=>{if(!qa.fixed||!qa.evidence)return;qa.fixedApproved=true;renderQA();qaSay(qaGate(qa)?'두 카드를 승인했습니다. ‘리뷰 확정’을 누르세요.':'TC 2를 승인했습니다. TC 1도 검토하세요.');});
  el('qa-exclude').addEventListener('click',()=>{qa.excluded=true;qa.evidence=false;qa.fixedApproved=false;renderQA();qaSay(qaGate(qa)?'미완성 TC 2를 이번 실행에서 제외합니다. ‘리뷰 확정’을 누르세요.':'TC 2를 제외했습니다. TC 1도 검토하세요.');});
  el('qa-confirm').addEventListener('click',()=>{if(!qaGate(qa))return;qa.confirmed=true;renderQA();qaSay(`리뷰 확정. ${qa.excluded?'TC 1개만':'TC 2개를'} 가상 실행 대상으로 준비했습니다.`);});
  el('qa-run').addEventListener('click',()=>{if(!qa.confirmed)return;qa.ran=true;qa.retried=false;renderQA();qaSay(qa.excluded?'가상 실행 완료: PASS 1, 미완성으로 제외 1.':'가상 실행 완료: PASS 1, FAIL 1. 실패한 TC를 재실행할 수 있습니다.');});
  el('qa-retry').addEventListener('click',()=>{if(!qa.ran||qa.excluded)return;qa.retried=true;renderQA();qaSay('실패 TC의 가상 재실행이 통과했습니다. 이전 실패 이력도 리포트에 남습니다.');});
  el('qa-target').addEventListener('change',()=>{qa.ran=false;qa.retried=false;renderQA();qaSay('실행 대상을 바꿨습니다. 이전 플랫폼의 결과를 재사용하지 않습니다.');});
  el('qa-reset').addEventListener('click',()=>{qa=newQA();el('qa-interview').value='unknown';el('qa-target').value='web';renderQA();qaSay('프로젝트를 초기화했습니다. 인터뷰 또는 TC 생성부터 다시 시작하세요.');});renderQA();
  el('release-form').addEventListener('submit',event=>{
    event.preventDefault();const request={repo:el('release-repo').value,date:el('release-date').value,note:el('release-note').value,linked:el('release-linked').value};const result=releaseCheck(request);
    list('release-results',result.checks.map(c=>`${c.ok?'통과':'보완'} · ${c.label}: ${c.ok?'예시 기준 충족':c.detail}`));
    put('release-notice',`[가상 알림 미리보기]\n${request.repo} / ${request.date||'날짜 미입력'}\n${result.ready?'요청 검증 통과 · 승인 절차 대기':'배포 요청 보완 필요'}\n${request.note||'변경 내용 미입력'}`);
    feedback('release-status',result.ready?'검증 통과: 필수값·티켓·중복을 모두 확인했습니다. 실제 승인·배포는 진행하지 않았습니다.':`보완 ${result.checks.filter(c=>!c.ok).length}건: ${result.checks.filter(c=>!c.ok).map(c=>c.label).join(' · ')}. ‘2. 보완된 예시 채우기’ 후 다시 검증해 보세요.`);
  });
  function clearRelease(){list('release-results',['입력 변경 · 다시 검증이 필요합니다.']);put('release-notice','현재 입력에 대한 검증·알림 미리보기 없음');put('release-status','입력이 변경되어 이전 검증 결과를 폐기했습니다.');}
  el('release-form').addEventListener('input',clearRelease);el('release-form').addEventListener('change',clearRelease);
  el('release-example').addEventListener('click',()=>{el('release-repo').value='catalog-api';el('release-date').value='2026-11-03';el('release-note').value='결제 오류 메시지 개선';el('release-linked').value='ready';clearRelease();feedback('release-status','가상 보완 내용을 채웠습니다. ‘1. 요청 검증’을 다시 눌러 결과를 비교하세요.');});
  el('release-reset').addEventListener('click',()=>{el('release-form').reset();clearRelease();});
  const events=[{service:'checkout-api',trace:'trace-order',span:'span-01',message:'결제 요청',level:'info'},{service:'search-api',trace:'trace-search',span:'span-02',message:'상품 검색 완료',level:'info'},{service:'payment-api',trace:'trace-order',span:'span-03',message:'결제 제공자 응답 시간 초과',level:'error'}];
  function renderLogs(){const trace=el('logs-trace').value;const selected=events.filter(e=>trace==='all'||e.trace===trace);put('logs-count',`이벤트 ${selected.length}건`);put('logs-output',selected.map(e=>el('logs-format').value==='ecs'?JSON.stringify({'service.name':e.service,'trace.id':e.trace,'span.id':e.span,'log.level':e.level,message:e.message},null,2):`[${e.service}] ${e.level.toUpperCase()} ${e.message}\ntrace=${e.trace} span=${e.span}`).join('\n\n'));put('logs-explanation',trace==='trace-order'?'주문 서비스가 결제를 요청했고, 같은 trace-order를 가진 결제 서비스에서 응답 시간 초과가 발생했습니다. 서로 다른 서비스의 로그 두 건을 하나의 요청으로 연결한 결과입니다.':trace==='trace-search'?'검색 요청은 trace-search로 별도 처리되었고 예시 로그에는 오류가 없습니다. 주문 장애와는 다른 요청입니다.':'서로 다른 요청 2개가 섞여 있습니다. ‘주문 요청 · trace-order’를 선택하면 주문→결제의 연결과 오류 지점을 확인할 수 있습니다.');put('logs-error',trace==='trace-search'?'선택한 검색 요청에는 오류 응답이 없습니다.':el('logs-protocol').value==='rest'?'주문 요청의 예시 응답 · HTTP 504\n{"error":{"code":504,"status":"DEADLINE_EXCEEDED",\n "message":"결제 제공자 응답 시간 초과"}}':'주문 요청의 예시 응답 · gRPC status: DEADLINE_EXCEEDED (4)\nmessage: 결제 제공자 응답 시간 초과');put('logs-status',`${trace==='all'?'전체 요청':trace} · 이벤트 ${selected.length}건. 로그 형식과 클라이언트 응답은 같은 오류의 서로 다른 표현입니다.`);}
  ['logs-trace','logs-format','logs-protocol'].forEach(id=>el(id).addEventListener('change',renderLogs));el('logs-reset').addEventListener('click',()=>{el('logs-trace').value='all';el('logs-format').value='raw';el('logs-protocol').value='rest';renderLogs();});renderLogs();
  root.querySelector('[data-demo-app]').hidden=false;
})();
