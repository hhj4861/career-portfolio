# 커리어 포트폴리오 인수인계

기준일: 2026-10-31  
저장소: [hhj4861/career-portfolio](https://github.com/hhj4861/career-portfolio)  
운영: [포트폴리오](https://hhj4861.github.io/career-portfolio/) · [이력서](https://hhj4861.github.io/career-portfolio/resume.html)

## 목적과 현재 구성

백엔드·개발 플랫폼 경력, 회사 업무 사례, 개인 프로젝트와 인터랙티브 데모를 소개하는 정적 사이트다. 회사 업무와 개인 실험을 구분하며, 실제 운영 상태와 파일럿 준비 상태를 혼동하지 않는다.

- **업무 데모 4종:** DBQ 검수, QA 자동화 스튜디오, PR 기반 배포 변경 통제, 로그 표준화. QA는 제공된 목업의 HTML을 격리된 iframe에서 사용한다.
- **개인 프로젝트:** 공개 GitHub 저장소 13개를 카드로 소개한다. PC에서는 3개를 보이고, 모바일에서는 한 카드 중심으로 좌우 스와이프한다. 버튼과 키보드 이동도 지원한다.
- **제외 기준:** 비공개 프로젝트와 `swagger_test`, `mcp`, `career-portfolio`는 표시하지 않는다. 공개 목록은 정적 스냅샷이며 GitHub와 자동 동기화되지 않는다.
- **체험 범위:** DBQ·배포·로그 데모는 가상 데이터와 브라우저 내 상태를 사용한다. 실제 GitHub·Jira·Slack·DB·AI에 요청하거나 배포하지 않는다.

## 파일과 수정 위치

| 파일 | 역할 |
| --- | --- |
| `profile.json` | 경력, 프로젝트 설명, 포트폴리오 및 이력서의 원본 데이터 |
| `public_repos.json` | 개인 프로젝트에 추가로 표시하는 공개 GitHub 저장소의 정적 목록 |
| `scripts/build.py` | 원본 데이터와 템플릿으로 `index.html`, `resume.html`, `README.md` 생성 |
| `templates/demo.html`, `templates/demo.css` | 데모 UI 및 스타일 원본 |
| `demo.js` | DBQ·배포 통제·로그 데모 상태와 동작 |
| `qa-reference.html` | QA 원본 목업 내보내기. 공개에 불필요한 내부 설치·권한 안내를 제거한 버전 |
| `personal-carousel.js`, `styles.css` | 개인 프로젝트 캐러셀 동작과 사이트 공통 스타일 |
| `scripts/test_demo.cjs`, `scripts/test_demo_state.cjs`, `tests/test_build.py` | 브라우저, 순수 로직, 빌드 검증 |
| `index.html`, `resume.html`, `README.md` | 생성 결과. 직접 수정하지 말고 원본을 수정한 뒤 빌드한다 |

개인 프로젝트 카드는 `profile.json`의 공개 링크가 있는 기존 소개와 `public_repos.json`을 합쳐 생성하며, 같은 GitHub URL은 한 번만 표시한다. 이력서의 개인 프로젝트는 `profile.json`을 사용한다. 목록을 바꿀 때 공개 여부를 먼저 확인하고 위 제외 기준을 유지한다. 소개가 확인되지 않은 저장소의 기능은 추정하지 않는다.

## 데모 유지보수 주의점

- DBQ: 코어 판정과 개발자 확인, DBA 확인을 구분한다. 답변 변경 후에는 재검수가 필요하다. 자동 검수나 운영 DB 실행으로 표현하지 않는다.
- QA: 원본 목업을 사용한다. 별도 화면 안내 투어와 체크리스트는 제거했으며 수정 이력은 유지한다. 회사 내부 설치·권한 정보나 내부 이미지를 공개 파일에 다시 넣지 않는다.
- 배포 통제: PR → 검사 → 가상 DCR → Slack 승인 요청 → 승인 확인 및 배포 게이트 순서다. 승인 전 차단과 승인자 결정 후 처리의 차이를 유지한다. 기존 Jira 요청 검증의 운영 적용과 PR 기반 DCR 흐름의 파일럿 준비 상태는 구분한다.
- 로그: 서비스별로 다른 형식 → 공통 필드 매핑 → 같은 요청의 서비스 간 추적 순서다. 정량 효과는 확인된 근거가 없으면 추가하지 않는다.

## 변경과 검증

```sh
python3 scripts/build.py
python3 -m unittest discover -s tests
node scripts/test_demo_state.cjs
node scripts/test_demo.cjs
git diff --check
```

브라우저 검증은 Playwright와 Chromium이 필요하다. 기존 설치를 사용할 경우 `PLAYWRIGHT_MODULE`과 `CHROMIUM_PATH` 환경 변수로 지정할 수 있다. 운영 사이트 대상으로 확인하려면 `BASE_URL=https://hhj4861.github.io/career-portfolio/`를 지정한다. 테스트는 임시 HTTP 서버와 브라우저를 사용한다.

개인 프로젝트 변경 시 ① 제외 항목과 공개 여부 ② 중복 URL ③ PC 3개 표시와 양방향 버튼 ④ 모바일 터치 스와이프 ⑤ 이력서·다른 데모 회귀를 확인한다. 2026-10-31 로컬 브라우저 검증에서 이러한 경로와 기존 데모가 통과했다. 브라우저 에뮬레이션은 실제 모바일 기기 확인을 대체하지 않는다.

## 배포

1. 원본 수정 후 빌드 및 위 검증을 실행한다. 생성 결과와 관련 파일을 함께 커밋한다.
2. `master`에 반영하면 GitHub Pages의 `pages build and deployment`가 실행된다.
3. GitHub Actions에서 해당 커밋의 배포 성공을 확인하고 운영 URL에서 변경 사항을 확인한다.
4. 스타일·스크립트의 콘텐츠 해시가 생성 HTML에 들어가므로 변경 후 반드시 빌드한다.

개인 저장소의 공개 목록은 수동 관리다. 새 저장소나 공개 범위가 바뀌면 GitHub에서 상태를 확인하고 `public_repos.json`을 수정해 다시 빌드·배포한다. 비공개 저장소를 공개 목록에 추가하거나 회사 내부 URL·설정·이미지를 공개 사이트에 넣지 않는다.
