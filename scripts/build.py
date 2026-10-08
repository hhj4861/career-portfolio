"""Build the portfolio, printable resume and README from profile.json.

No external packages, network calls, or deployment steps are needed.
Source assets (styles.css, demo.js, templates/) are intentionally not overwritten.
"""
from pathlib import Path
import html
import json
import hashlib
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'profile.json').read_text(encoding='utf-8'))


def esc(value):
    return html.escape(str(value or ''), quote=True)


def safe_url(value):
    if value and (value.startswith('#') or urlparse(value).scheme == 'https'):
        return esc(value)
    raise ValueError(f'Unsupported link: {value!r}')


def bullets(items):
    return '<ul>' + ''.join(f'<li>{esc(item)}</li>' for item in items) + '</ul>' if items else ''


def asset(path):
    digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()[:12]
    return esc(path) + '?v=' + digest


def head(title, resume=False):
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{esc(DATA['name'])}의 백엔드·개발 플랫폼 경력. 쏘카 업무 사례와 금융·결제·커머스 개발 경험">
<meta name="color-scheme" content="light">
<title>{esc(title)}</title><link rel="stylesheet" href="{asset('styles.css')}">
{'' if resume else '<link rel="stylesheet" href="' + asset('templates/demo.css') + '">'}
</head><body>'''


def navigation(resume=False):
    links = '<a href="index.html">← 포트폴리오</a><button class="button print-tools" id="print" type="button">인쇄 / PDF 저장</button>' if resume else '<a href="#projects">업무 사례</a><a href="#demo">인터랙티브 데모</a><a href="#experience">경력</a><a href="resume.html">이력서 ↗</a>'
    return f'<a class="skip" href="#main">본문으로 이동</a><nav aria-label="주요 메뉴"><a class="brand" href="index.html">{esc(DATA["name"])}<small>ENGINEER</small></a><div class="links">{links}</div></nav>'


def review_banner():
    return '<div class="review-banner">검토용 초안 · 회사별 수행 범위·기간 확인 후 공개 반영 · DB 변경 검수는 현재 검수 진행 단계</div>' if DATA.get('review_mode') else ''


def section_title(number, title, note=''):
    return f'<div class="section-title"><div><span class="section-no">{esc(number)}</span><h2>{esc(title)}</h2></div>{f"<p>{esc(note)}</p>" if note else ""}</div>'


def skills():
    return '<div class="skills">' + ''.join(f'<div><span class="mini-label">0{i} / CORE EXPERIENCE</span><h3>{esc(s["title"])}</h3><p>{esc(s["body"])}</p></div>' for i, s in enumerate(DATA['skills'], 1)) + '</div>'


def work_projects():
    result = []
    for i, p in enumerate(DATA['projects'], 1):
        rows = [('문제', p['problem']), ('내 역할', p['role']), ('접근·구현', p['approach']), ('결과·상태', p['result'])]
        cta = f'<a class="text-link" href="{safe_url(p["demo"])}">검수 원리 데모 ↓</a>' if p.get('demo') else ''
        result.append(f'''<article class="project" id="{esc(p['id'])}">
<div class="project-head"><span class="eyebrow">0{i} / {esc(p['category'])}</span><h3>{esc(p['title'])}</h3><p>{esc(p['subtitle'])}</p><span class="pill">{esc(p['status'])}</span><p class="stack">{esc(p['period'])}<br>{esc(p['stack'])}</p>{cta}</div>
<div class="project-body">{''.join(f'<div class="case-row"><h4>{esc(label)}</h4><p>{esc(text)}</p></div>' for label, text in rows)}<p class="scope">{esc(p['scope'])}</p></div></article>''')
    return '<div class="projects">' + ''.join(result) + '</div>'


def career_projects(c):
    parts = []
    for p in c.get('projects', []):
        period = f'<span class="period">{esc(p["period"])}</span>' if p.get('period') else ''
        stack = f'<p>{esc(p["stack"])}</p>' if p.get('stack') else ''
        parts.append(f'<section class="career-project"><h4>{esc(p["title"])} {period}</h4>{bullets(p["bullets"])}{stack}</section>')
    return ''.join(parts)


def careers(resume=False):
    result = []
    for c in DATA['careers']:
        body = career_projects(c)
        if not resume:
            body = f'<details><summary>프로젝트별 역할·구현 내용 보기 ({len(c.get("projects", []))})</summary>{body}</details>'
        stack = f'<p class="note">{esc(c["stack"])}</p>' if c.get('stack') else ''
        result.append(f'''<article class="career"><div><h3>{esc(c['company'])}</h3><span class="muted">{esc(c['period'])}</span></div><div><p class="role">{esc(c['role'])}</p><p class="career-summary">{esc(c.get('summary'))}</p>{bullets(c.get('bullets', []))}{body}{stack}</div></article>''')
    return ''.join(result)


def personal_projects(resume=False):
    result = []
    for p in DATA['personal_projects']:
        link = f'<a class="text-link" href="{safe_url(p["link"])}">GitHub 코드 ↗</a>' if p.get('link') else '<span class="note">비공개 · 소개만 공개</span>'
        description = p['approach'] if resume else p['result']
        result.append(f'<article class="personal-card"><span class="pill">개인 연구·실험</span><h3>{esc(p["title"])}</h3><p>{esc(description)}</p><p class="stack">{esc(p["stack"])}</p>{link}</article>')
    return '<div class="personal-grid">' + ''.join(result) + '</div>'


def education():
    return f'<div class="education"><div><h3>학력</h3><p>{esc(DATA["education"])}</p></div><div><h3>자격</h3><p>{esc(DATA["certification"])}</p></div></div>'


def review_notice():
    if not DATA.get('review_mode'):
        return ''
    return '<section class="section"><div class="review-notice"><h2>공개 반영 전 확인할 내용</h2>' + bullets(DATA['review_items']) + '<p>이 영역은 검토용입니다. 확인이 끝나면 profile.json의 review_mode를 false로 변경해 숨길 수 있습니다.</p></div></section>'


def footer():
    return f'<footer><div><p>{esc(DATA["name"])} · BACKEND &amp; DEVELOPER PLATFORM</p><p class="fine">회사 업무는 역할과 검증 가능한 상태를 중심으로 정리했습니다. 개인 실험과 시뮬레이션은 별도로 구분합니다.</p></div><div><a href="{safe_url(DATA["github"])}">GitHub ↗</a> · 업데이트 {esc(DATA["updated"])}</div></footer>'


def build_index():
    headline = '<br>'.join(esc(line) for line in DATA['headline'].splitlines())
    demo_file = ROOT / 'templates/demo.html'
    demo = demo_file.read_text(encoding='utf-8') if demo_file.exists() else '<section class="section" id="demo"><h2>검수 워크플로 데모</h2><p>데모 준비 중</p></section>'
    return head('홍현종 | Backend & Developer Platform') + navigation() + f'''
<main id="main">{review_banner()}<section class="hero"><div><p class="eyebrow">Backend · Developer Platform · Automation</p><h1>{headline}</h1><p class="intro">{esc(DATA['summary'])}</p><div class="buttons"><a class="button primary" href="#projects">최근 업무 사례 보기 ↓</a><a class="button" href="resume.html">이력서 읽기 ↗</a><a class="button" href="#demo">데모 체험</a></div></div><aside class="hero-aside" aria-label="경력 개요"><div class="portrait-mark" aria-hidden="true">HHJ</div><p class="current-role">현재 집중하는 일<strong>개발 플랫폼 · 업무 자동화</strong><span class="muted">SOCAR · 2025.03–현재</span></p><ol class="path"><li><strong>금융 시스템</strong><span>2013–2017</span></li><li><strong>결제 · 서비스 연동</strong><span>2017–2022</span></li><li><strong>커머스 · 개발 리딩</strong><span>2022–2025</span></li><li><strong>개발 플랫폼</strong><span>2025–현재</span></li></ol></aside></section>
<section class="section" aria-label="핵심 경험">{skills()}</section>
<section class="section" id="projects">{section_title('01 / SELECTED WORK', '최근 회사 업무', '쏘카에서 수행한 개발 플랫폼 업무를 문제, 역할, 구현과 현재 상태로 정리했습니다.')}{work_projects()}</section>
{demo}
<section class="section" id="experience">{section_title('03 / EXPERIENCE', '경력과 문제 해결', '회사의 규모나 기술 목록보다 직접 맡은 업무와 해결 과정을 중심으로 살펴보세요.')}{careers()}</section>
<section class="section" id="personal">{section_title('04 / PERSONAL LAB', '참고 · 개인 프로젝트', '생성 API와 데이터 파이프라인을 탐구한 개인 실험입니다. 회사 성과와 별도로 소개합니다.')}{personal_projects()}</section>
<section class="section">{education()}</section>{review_notice()}</main>{footer()}<script src="{asset('demo.js')}" defer></script></body></html>'''


def build_resume():
    return head('홍현종 | 경력 이력서', resume=True) + navigation(resume=True) + f'''
<main id="main" class="resume-page">{review_banner()}<header class="resume-header"><div><p class="eyebrow">RESUME / {esc(DATA['updated'])}</p><h1>{esc(DATA['name'])}</h1><p>백엔드 · 개발 플랫폼 · 업무 자동화</p></div><div class="resume-contact"><a href="{safe_url(DATA['github'])}">github.com/hhj4861</a><br><a href="index.html">포트폴리오 · 업무 사례와 데모 ↗</a></div></header><p class="intro">{esc(DATA['summary'])}</p><ul class="summary-list">{''.join(f'<li>{esc(x)}</li>' for x in DATA['intro_points'])}</ul>
<section class="section"><h2>핵심 기술과 경험</h2>{skills()}</section>
<section class="section" id="experience"><h2>경력 상세</h2>{careers(resume=True)}</section>
<section class="section"><h2>참고 · 개인 프로젝트</h2>{personal_projects(resume=True)}</section>
<section class="section">{education()}</section>{review_notice()}</main>{footer()}<script src="{asset('print.js')}" defer></script></body></html>'''


def build_readme():
    lines = [f'# {DATA["name"]}', '', '백엔드 · 개발 플랫폼 · 업무 자동화', '', DATA['summary'], '', '[포트폴리오](https://hhj4861.github.io/career-portfolio/) · [이력서](https://hhj4861.github.io/career-portfolio/resume.html)', '', '## 최근 회사 업무', '']
    for p in DATA['projects']:
        lines += [f'### {p["title"]}', '', f'쏘카 · {p["period"]} · {p["status"]}', '', f'- 문제: {p["problem"]}', f'- 역할: {p["role"]}', f'- 구현: {p["approach"]}', f'- 결과·상태: {p["result"]}', f'- 범위: {p["scope"]}', '']
    lines += ['## 경력', '']
    for c in DATA['careers']:
        lines += [f'### {c["company"]} | {c["period"]}', '', c['role'], '', c['summary'], ''] + [f'- {x}' for x in c.get('bullets', [])]
        for p in c.get('projects', []):
            lines += ['', f'#### {p["title"]}' + (f' · {p["period"]}' if p.get('period') else ''), ''] + [f'- {x}' for x in p['bullets']]
        lines += ['']
    lines += ['## 참고 · 개인 프로젝트', '']
    for p in DATA['personal_projects']:
        lines += [f'### {p["title"]}', '', p['result'], '']
        if p.get('link'):
            lines += [f'[코드 보기]({p["link"]})', '']
    lines += ['## 로컬 실행 및 검증', '', 'Python 3와 정적 파일만으로 빌드됩니다.', '', '```bash', 'python3 scripts/build.py', 'python3 -m unittest discover -s tests -v', 'python3 -m http.server 8765', '```', '', '브라우저에서 `http://localhost:8765/`를 열고, 이력서는 `resume.html`에서 인쇄/PDF 저장할 수 있습니다.', '', '`profile.json`이 경력 내용의 기준입니다. `scripts/build.py`는 `index.html`, `resume.html`, `README.md`를 생성합니다. CSS와 데모는 소스 자산으로 보존합니다.', '', 'Playwright가 설치된 환경에서는 `BASE_URL=http://localhost:8765 node scripts/test_demo.cjs`로 데모 동작을 검사할 수 있습니다.', '', '## 공개 범위', '', '- 회사 업무의 상태는 프로젝트별로 구분합니다. 검수/파일럿을 운영 완료로 바꾸지 않습니다.', '- 데모는 가상 데이터로 동작하는 별도 설명용 시뮬레이션입니다. 실제 회사 서비스·데이터·코드를 포함하지 않으며 네트워크 전송이나 DB 실행을 하지 않습니다.', '- 회사 내부 URL, 원문 증거, 연락처, 인증정보는 저장하지 않습니다.', '- 로컬 빌드와 검증은 배포를 수행하지 않습니다.', '']
    return '\n'.join(lines)


def main():
    if len(DATA['careers']) != 7:
        raise ValueError('Expected the seven source careers to be preserved')
    for name, content in [('index.html', build_index()), ('resume.html', build_resume()), ('README.md', build_readme())]:
        (ROOT / name).write_text(content, encoding='utf-8')
    print('Generated index.html, resume.html and README.md (no deployment)')


if __name__ == '__main__':
    main()
