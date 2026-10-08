/* Portfolio-only review simulation. Fictional inputs; no requests, storage, or DB execution. */
(() => {
  'use strict';
  const root = document.getElementById('demo');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const scenarios = {
    index: {
      ddl: '-- 가상 예시 / 실행되지 않습니다\nCREATE INDEX idx_demo_orders_created_at\n  ON demo_orders (created_at);',
      context: '가상 주문 테이블의 기간별 조회를 위한 인덱스입니다. 조회 패턴과 작업 중 잠금 영향을 따로 확인합니다.',
      questions: [
        { id: 'query-plan', title: '추가할 인덱스가 실제 조회 조건과 맞나요?', answer: '가상 실행 계획과 기존 인덱스를 비교했습니다', partial: '인덱스를 추가하면 빨라질 것 같습니다', why: '예상 효과만으로는 조회 조건과 중복 여부를 확인할 수 없습니다.', evidence: '가상 검토 메모 A-01: 기간 조건은 created_at이며 기존 인덱스는 id에만 있습니다. 샘플 실행 계획을 비교했다는 설정입니다. 실제 쿼리·성능 측정 결과가 아닙니다.' },
        { id: 'lock-window', title: '인덱스 생성 중 잠금 영향을 검토했나요?', answer: '가상 잠금 검토와 작업 중단 기준을 확인했습니다', partial: '트래픽이 적을 때 진행할 예정입니다', why: '작업 시간만 정하면 잠금 영향과 중단 기준은 여전히 미확인입니다.', evidence: '가상 검토 메모 A-02: 샘플 DDL의 잠금 영향을 별도로 검토하고, 검수 시 확인할 중단 기준과 담당자 항목을 준비했다는 설정입니다. 실제 작업 일정이나 운영 기준이 아닙니다.' }
      ]
    },
    'not-null': {
      ddl: '-- 가상 예시 / 실행되지 않습니다\nALTER TABLE demo_members\n  ALTER COLUMN email SET NOT NULL;',
      context: '가상 회원 테이블의 이메일을 필수 값으로 바꾸는 변경입니다. 기존 데이터와 신규 쓰기 경로를 모두 확인합니다.',
      questions: [
        { id: 'null-rows', title: '기존 NULL 데이터가 남아 있는지 확인했나요?', answer: '가상 NULL 점검과 보정 확인 자료를 검토했습니다', partial: '앞으로 이메일을 필수 입력으로 받을 예정입니다', why: '앞으로의 입력 정책만으로는 기존 데이터의 NULL 여부를 알 수 없습니다.', evidence: '가상 검토 메모 B-01: 샘플 데이터의 NULL 점검 항목과 보정 후 재확인 기록이 준비되었다는 설정입니다. 실제 DB를 조회하거나 데이터를 수정한 결과가 아닙니다.' },
        { id: 'write-paths', title: 'API와 배치의 쓰기 경로가 새 제약을 지키나요?', answer: '가상 API·배치 입력 조건과 전환 순서를 확인했습니다', partial: '대표 API 한 곳만 확인했습니다', why: '대표 API만 확인하면 배치나 다른 쓰기 경로의 영향은 남습니다.', evidence: '가상 검토 메모 B-02: API와 배치의 입력 조건, 애플리케이션과 스키마의 전환 순서를 함께 점검했다는 설정입니다. 실제 서비스 테스트나 배포 결과가 아닙니다.' }
      ]
    },
    'drop-column': {
      ddl: '-- 가상 예시 / 실행되지 않습니다\nALTER TABLE demo_orders\n  DROP COLUMN legacy_status;',
      context: '가상 주문 테이블의 오래된 상태 컬럼을 제거하는 변경입니다. 사용처와 삭제 후 복구 가능성을 질문으로 남깁니다.',
      questions: [
        { id: 'dependencies', title: 'API·배치·리포트의 컬럼 사용처를 확인했나요?', answer: '가상 의존성 목록과 사용처 점검을 확인했습니다', partial: '최근 코드에서는 사용하지 않는 것 같습니다', why: '최근 코드만 보면 배치나 리포트 등 다른 의존성이 빠질 수 있습니다.', evidence: '가상 검토 메모 C-01: API·배치·리포트의 의존성 목록을 별도로 확인했다는 설정입니다. 실제 회사의 코드, 시스템 구조, 사용처 정보는 포함하지 않습니다.' },
        { id: 'restore-plan', title: '삭제된 데이터의 복구 가능성을 검토했나요?', answer: '가상 백업·복구 점검과 중단 기준을 확인했습니다', partial: '문제가 생기면 컬럼을 다시 만들겠습니다', why: '컬럼을 다시 만드는 것만으로는 삭제된 데이터가 복구되지 않습니다.', evidence: '가상 검토 메모 C-02: 백업 자료와 복구 확인 항목, 복구 범위의 한계를 검수했다는 설정입니다. 실제 백업 파일이나 복구 테스트 결과가 아닙니다.' }
      ]
    }
  };
  const blank = () => ({ runs: 0, answers: {}, evidence: {}, opened: {}, acknowledged: false, approved: false, history: [] });
  const states = Object.fromEntries(Object.keys(scenarios).map(key => [key, blank()]));
  const el = id => root.querySelector(`#demo-${id}`);
  const elements = Object.fromEntries(['scenario', 'ddl', 'context', 'analyze', 'reset', 'analysis-badge', 'unresolved', 'evidence-count', 'approval-state', 'empty', 'questions', 'approval-panel', 'acknowledge', 'approve', 'approval-hint', 'feedback', 'history-list'].map(id => [id, el(id)]));
  let active = 'index';
  let busy = false;
  let timer = null;
  let generation = 0;
  const current = () => states[active];
  const questionId = (id, suffix) => `demo-${active}-${id}-${suffix}`;
  const count = () => {
    const state = current();
    const questions = scenarios[active].questions;
    return {
      total: questions.length,
      answered: questions.filter(q => state.answers[q.id] === 'complete').length,
      evidence: questions.filter(q => state.answers[q.id] === 'complete' && state.evidence[q.id]).length
    };
  };
  const announce = text => { elements.feedback.textContent = text; };
  const record = text => {
    current().history.unshift(text);
    // Bound the visible, in-memory log even when controls are used repeatedly.
    current().history = current().history.slice(0, 6);
  };
  const invalidateApproval = () => { current().acknowledged = false; current().approved = false; };
  const cancelAnalysis = () => { generation += 1; clearTimeout(timer); timer = null; busy = false; };
  const textNode = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  };

  function buildQuestions() {
    elements.questions.replaceChildren();
    if (!current().runs) return;
    for (const [index, q] of scenarios[active].questions.entries()) {
      const article = textNode('article', 'demo-question', '');
      article.dataset.question = q.id;
      const top = textNode('div', 'demo-question-top', '');
      const heading = textNode('h4', '', `Q${index + 1}. ${q.title}`);
      heading.id = questionId(q.id, 'title');
      article.setAttribute('aria-labelledby', heading.id);
      const badge = textNode('span', 'demo-question-state', '미해결');
      badge.dataset.field = 'badge';
      top.append(heading, badge);
      const label = textNode('label', 'demo-answer-label', '제공된 샘플 답변 선택');
      label.htmlFor = questionId(q.id, 'answer');
      const select = document.createElement('select');
      select.id = label.htmlFor;
      select.dataset.action = 'answer';
      select.setAttribute('aria-labelledby', `${heading.id} ${label.htmlFor}-label`);
      label.id = `${label.htmlFor}-label`;
      select.setAttribute('aria-describedby', questionId(q.id, 'feedback'));
      [['', '답변을 선택해 주세요'], ['partial', q.partial], ['complete', q.answer]].forEach(([value, text]) => {
        const option = textNode('option', '', text);
        option.value = value;
        select.append(option);
      });
      const feedback = textNode('p', 'demo-answer-feedback', '');
      feedback.id = questionId(q.id, 'feedback');
      feedback.dataset.field = 'feedback';
      const show = textNode('button', 'demo-evidence-toggle', '가상 근거 보기');
      show.type = 'button';
      show.dataset.action = 'toggle-evidence';
      show.setAttribute('aria-controls', questionId(q.id, 'evidence'));
      show.setAttribute('aria-expanded', 'false');
      show.setAttribute('aria-label', `Q${index + 1} 가상 근거 보기`);
      const evidence = textNode('div', 'demo-evidence', '');
      evidence.id = questionId(q.id, 'evidence');
      evidence.hidden = true;
      evidence.append(textNode('p', 'demo-evidence-label', 'FICTIONAL EVIDENCE / 설명용 샘플'), textNode('p', '', q.evidence));
      const checkLabel = textNode('label', 'demo-check', '');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = questionId(q.id, 'checked');
      checkbox.dataset.action = 'check-evidence';
      checkbox.setAttribute('aria-label', `Q${index + 1} 가상 답변에 연결된 근거 확인`);
      checkLabel.append(checkbox, textNode('span', '', '이 가상 답변에 연결된 근거를 확인했습니다'));
      evidence.append(checkLabel);
      article.append(top, label, select, feedback, show, evidence);
      elements.questions.append(article);
    }
  }

  function render() {
    const state = current();
    const counts = count();
    const answered = counts.answered === counts.total;
    const ready = state.runs > 0 && answered && counts.evidence === counts.total;
    elements['analysis-badge'].textContent = busy ? '분석 중' : state.runs ? `분석 완료 · ${state.runs}회` : '분석 전';
    elements['analysis-badge'].classList.toggle('is-analyzed', state.runs > 0 && !busy);
    elements.analyze.textContent = busy ? '분석 중…' : state.runs ? '재분석 · 질문 유지' : '변경 분석하기';
    elements.analyze.disabled = busy;
    elements.unresolved.textContent = state.runs ? `${counts.total - counts.answered}개` : '—';
    elements['evidence-count'].textContent = state.runs ? `${counts.evidence} / ${counts.total}` : '0 / 0';
    elements['approval-state'].textContent = state.approved ? '승인됨' : '대기';
    elements.empty.hidden = state.runs > 0;
    elements['approval-panel'].hidden = !state.runs;
    elements.questions.setAttribute('aria-busy', String(busy));
    for (const q of scenarios[active].questions) {
      const article = elements.questions.querySelector(`[data-question="${q.id}"]`);
      if (!article) continue;
      const complete = state.answers[q.id] === 'complete';
      const answer = article.querySelector('[data-action="answer"]');
      answer.value = state.answers[q.id] || '';
      answer.disabled = busy;
      const badge = article.querySelector('[data-field="badge"]');
      badge.textContent = complete ? '답변 확인' : '미해결';
      badge.classList.toggle('is-resolved', complete);
      const feedback = article.querySelector('[data-field="feedback"]');
      feedback.textContent = complete ? '답변이 준비되었습니다. 연결된 가상 근거를 확인해 주세요.' : state.answers[q.id] === 'partial' ? q.why : '답변이 없으므로 질문을 미해결 상태로 유지합니다.';
      feedback.classList.toggle('is-pending', state.answers[q.id] === 'partial');
      const toggle = article.querySelector('[data-action="toggle-evidence"]');
      toggle.disabled = !complete || busy;
      const open = complete && !!state.opened[q.id];
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '가상 근거 접기' : '가상 근거 보기';
      toggle.setAttribute('aria-label', `${article.querySelector('h4').textContent.split('.')[0]} 가상 근거 ${open ? '접기' : '보기'}`);
      const evidence = article.querySelector('.demo-evidence');
      evidence.hidden = !open;
      const checkbox = article.querySelector('[data-action="check-evidence"]');
      checkbox.checked = !!state.evidence[q.id];
      checkbox.disabled = !complete || busy;
    }
    elements.acknowledge.disabled = !ready || busy;
    elements.acknowledge.checked = state.acknowledged;
    elements.approve.disabled = !ready || !state.acknowledged || state.approved || busy;
    elements.approve.textContent = state.approved ? '검수 승인 시뮬레이션 완료' : '검수 승인 시뮬레이션';
    elements['approval-hint'].textContent = state.approved ? '이 페이지의 로컬 검수 상태만 바뀌었습니다. 실제 변경이나 외부 전송은 없습니다.' : ready ? '명시적 확인 후 승인할 수 있습니다. 승인은 DB 실행을 의미하지 않습니다.' : `미해결 질문 ${counts.total - counts.answered}개, 근거 미확인 ${counts.total - counts.evidence}개가 남아 있습니다.`;
    const stage = !state.runs || busy ? 'analysis' : !answered ? 'answers' : counts.evidence < counts.total ? 'evidence' : 'approval';
    const order = ['analysis', 'answers', 'evidence', 'approval'];
    root.querySelectorAll('[data-demo-step]').forEach(step => {
      const key = step.dataset.demoStep;
      if (key === stage && !state.approved) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      step.classList.toggle('is-complete', state.approved || order.indexOf(key) < order.indexOf(stage));
    });
    elements['history-list'].replaceChildren(...(state.history.length ? state.history : ['선택한 시나리오의 활동이 여기에 표시됩니다.']).map(text => textNode('li', '', text)));
  }

  function loadScenario() {
    elements.ddl.textContent = scenarios[active].ddl;
    elements.context.textContent = scenarios[active].context;
    buildQuestions();
    render();
  }

  elements.scenario.addEventListener('change', () => {
    cancelAnalysis();
    active = elements.scenario.value;
    loadScenario();
    const counts = count();
    announce(current().runs ? `시나리오를 전환했습니다. 저장된 미해결 질문 ${counts.total - counts.answered}개와 검수 상태를 복원했습니다.` : '시나리오를 전환했습니다. 변경 분석을 시작해 주세요.');
  });
  elements.reset.addEventListener('click', () => {
    cancelAnalysis();
    states[active] = blank();
    loadScenario();
    announce('이 시나리오의 질문·답변·근거 확인·승인 상태를 초기화했습니다. 다른 시나리오의 상태는 유지됩니다.');
  });
  elements.analyze.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    const version = ++generation;
    const scenario = active;
    invalidateApproval();
    render();
    announce(current().runs ? '재분석 중입니다. 기존 질문과 답변·근거 확인을 유지합니다.' : '가상 DDL의 확인 질문을 구성하고 있습니다. 실제 분석 서버나 DB에 연결하지 않습니다.');
    timer = setTimeout(() => {
      if (version !== generation || scenario !== active) return;
      timer = null;
      busy = false;
      current().runs += 1;
      const counts = count();
      const remaining = counts.total - counts.answered;
      record(current().runs === 1 ? `분석 1회: 가상 검수 질문 ${counts.total}개 생성. 승인은 대기.` : `분석 ${current().runs}회: 미해결 질문 ${remaining}개와 답변·근거 상태 유지. 명시적 승인은 다시 필요.`);
      if (current().runs === 1) buildQuestions();
      render();
      announce(current().runs === 1 ? `분석 완료. 미해결 질문 ${remaining}개가 있습니다. 분석만으로 승인되지 않습니다.` : `재분석 완료. 미해결 질문 ${remaining}개가 그대로 유지되었습니다. 기존 답변과 근거 확인을 보존했으며, 검수 승인은 다시 필요합니다.`);
    }, 360);
  });
  elements.questions.addEventListener('change', event => {
    if (busy) return;
    const control = event.target;
    const article = control.closest('[data-question]');
    if (!article) return;
    const id = article.dataset.question;
    if (control.dataset.action === 'answer') {
      current().answers[id] = control.value;
      current().evidence[id] = false;
      current().opened[id] = false;
      invalidateApproval();
      const counts = count();
      record(`샘플 답변 변경: 미해결 질문 ${counts.total - counts.answered}개. 해당 근거와 승인은 다시 확인.`);
      render();
      announce(control.value === 'complete' ? '샘플 답변이 준비되었습니다. 가상 근거를 열어 확인해 주세요.' : control.value === 'partial' ? `질문을 미해결 상태로 유지합니다. ${scenarios[active].questions.find(q => q.id === id).why}` : '답변이 선택되지 않아 질문을 미해결 상태로 유지합니다.');
    } else if (control.dataset.action === 'check-evidence' && current().answers[id] === 'complete') {
      current().evidence[id] = control.checked;
      invalidateApproval();
      record(control.checked ? '가상 근거 확인을 기록했습니다.' : '가상 근거 확인을 해제했습니다. 승인은 다시 필요합니다.');
      render();
      announce(control.checked ? '가상 근거 확인을 기록했습니다. 모든 질문과 근거를 확인해도 승인은 별도로 필요합니다.' : '근거 확인을 해제했습니다. 검수 승인 상태를 대기로 변경했습니다.');
    }
  });
  elements.questions.addEventListener('click', event => {
    const button = event.target.closest('[data-action="toggle-evidence"]');
    if (!button || button.disabled || busy) return;
    const id = button.closest('[data-question]').dataset.question;
    current().opened[id] = !current().opened[id];
    render();
  });
  elements.acknowledge.addEventListener('change', () => {
    if (busy || elements.acknowledge.disabled) return;
    current().acknowledged = elements.acknowledge.checked;
    current().approved = false;
    render();
    announce(current().acknowledged ? '승인 의사를 확인했습니다. 검수 승인 시뮬레이션 버튼을 눌러 마무리하세요.' : '승인 의사 확인을 해제했습니다. 검수 승인 상태는 대기입니다.');
  });
  elements.approve.addEventListener('click', () => {
    const counts = count();
    if (busy || !current().runs || !current().acknowledged || counts.answered !== counts.total || counts.evidence !== counts.total || current().approved) return;
    current().approved = true;
    record('사용자가 검수 승인 시뮬레이션을 완료했습니다. 로컬 상태만 변경.');
    render();
    announce('검수 승인 시뮬레이션 완료. 질문 답변·근거 확인·명시적 승인을 거쳤습니다. 실제 DB 변경이나 네트워크 요청은 발생하지 않았습니다.');
  });

  root.querySelector('[data-demo-app]').hidden = false;
  loadScenario();
})();
