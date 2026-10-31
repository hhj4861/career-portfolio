/* node scripts/test_demo.cjs
 * Full static-site browser checks. Optional BASE_URL tests the deployed site.
 * PLAYWRIGHT_MODULE and CHROMIUM_PATH allow an existing local installation.
 */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
  let server,browser;const checks=[];
  const check=(v,m)=>{assert(v,m);checks.push(m);console.log('✓ '+m);};
  try {
    let base=process.env.BASE_URL;
    if(!base){server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://local').pathname;const target=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',target.endsWith('.css')?'text/css':target.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/`;}
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
    const mobile = await browser.newPage({viewport:{width:390,height:700},isMobile:true,hasTouch:true});
    await mobile.goto(new URL('#demo',base).href,{waitUntil:'networkidle'});
    await mobile.locator('[data-tab=qa]').click();
    check(await mobile.locator('.qa-reference').isVisible(),'Original QA mockup is available on mobile');
    await mobile.close();
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('#demo',base).href,{waitUntil:'networkidle'});await page.locator('[data-demo-app]').waitFor({state:'visible'});
    const interactionRequests=[];page.on('request',req=>interactionRequests.push(req.url()));
    const text=async id=>(await page.locator('#'+id).textContent()).trim();
    const click=id=>page.locator('#'+id).click();
    const select=(id,value)=>page.locator('#'+id).selectOption(value);
    const tab=id=>page.locator('[data-tab="'+id+'"]').click();
    const step=(name,n)=>page.locator(`[data-wizard="${name}"] [data-step-target="${n}"]`).click();
    check(await page.locator('[role=tab]').count()===4,'Four distinct workbenches available');
    await click('dbq-run');check(await page.locator('[data-wizard=dbq] [data-step="1"]').isVisible()&&await text('dbq-pending')==='1건','DBQ proceeds from change selection to review');
    await select('dbq-answer','vague');await click('dbq-rerun');check(await text('dbq-pending')==='1건','Approval is not evidence');
    await select('dbq-answer','fact');await click('dbq-rerun');check(await text('dbq-pending')==='0건'&&await text('dbq-dba')==='1건 · 별도','Re-review resolves requester and keeps DBA separate');
    await step('dbq',2);await click('dbq-next');check((await text('dbq-next-result')).includes('코딩 가이드'),'DDL next step shows coding guide');
    await step('dbq',1);await select('dbq-answer','');check(await page.locator('#dbq-next-panel').isHidden(),'Changed answer invalidates downstream result');
    await step('dbq',0);await select('dbq-scenario','dml');await click('dbq-run');await select('dbq-answer','fact');await click('dbq-rerun');await step('dbq',2);await click('dbq-next');check((await text('dbq-next-result')).includes('미리보기'),'DML preview requires consent');await click('dbq-next');check((await text('dbq-next-result')).includes('DEMO-001'),'DML explicit fixture creation');
    await step('dbq',0);await select('dbq-scenario','unknown');await click('dbq-run');check(await text('dbq-verdict')==='미실행','Unknown SQL does not fabricate a result');await click('dbq-source');check(await page.locator('[data-wizard=dbq] [data-step="0"]').isVisible(),'Source correction returns to input');await click('dbq-run');check(await text('dbq-pending')==='1건','Source fix does not invent answer');
    await step('dbq',0);await select('dbq-mode','pr');await select('dbq-scenario','none');await click('dbq-run');check((await text('dbq-summary')).includes('생략'),'PR non-DB change skips SQL');
    await step('dbq',0);await select('dbq-scenario','schema');await click('dbq-run');await select('dbq-answer','fact');await click('dbq-rerun');await step('dbq',2);await click('dbq-next');check((await text('dbq-next-result')).includes('DBA용'),'PR has separate DBA report');
    await step('dbq',0);await select('dbq-mode','local');check(await text('dbq-pending')==='1건','Local and PR fixture state stays isolated');await click('dbq-reset');check(await text('dbq-verdict')==='—','DBQ reset clears current scenario');
    await tab('qa');
    const qaFrame=page.frameLocator('.qa-reference');
    await qaFrame.locator('[data-s=tcreview]').click();
    check(await qaFrame.getByText('6개 중 2개 검토').isVisible(),'Original mockup opens its six-case TC review');
    check(await qaFrame.locator('.tg-mask, .tg-pop, .tg-launch, [data-skill-id=app-guide], #rb-check').count()===0,'Screen guidance and checklist are absent');
    check(await qaFrame.locator('#rb-hist').isVisible(),'Review history remains available');
    await qaFrame.locator('button').filter({hasText:/승인/}).filter({hasNotText:/승인됨/}).first().click();
    check(await qaFrame.getByText('6개 중 3개 검토').isVisible(),'Original TC approval updates review progress');
    check(await page.locator('#qa-confirm, #qa-evidence').count()===0,'Invented approval gate is removed');
    await tab('release');await select('release-linked','missing');await click('release-pr');await click('release-check');check((await text('release-status')).includes('연결하세요'),'Missing development ticket blocks check');
    await step('release',4);await click('release-gate');check((await text('release-gate-result')).includes('차단'),'Unapproved DCR blocks deployment');
    await step('release',0);await select('release-linked','incomplete');await click('release-pr');await click('release-check');check((await text('release-status')).includes('보완'),'Missing control information is shown');
    await step('release',0);await select('release-linked','ready');await click('release-pr');await click('release-check');check(await page.locator('[data-wizard=release] [data-step="2"]').isVisible()&&(await text('release-dcr')).includes('DCR-DEMO-01'),'Passing check creates a fictional DCR');
    await click('release-create');check((await text('release-notice')).includes('승인자 응답 대기'),'Slack request is automatically shown as awaiting approval');await click('release-approve');check((await text('release-notice')).includes('승인 상태 전환'),'An approver decision triggers Jira state transition');await click('release-gate');check((await text('release-gate-result')).includes('통과'),'Approved fictional DCR passes gate');
    await step('release',0);await select('release-linked','missing');await step('release',4);await click('release-gate');check((await text('release-gate-result')).includes('차단'),'Changing input invalidates prior approval');
    await tab('logs');check((await text('logs-before')).includes('traceId=trace-order')&&(await text('logs-before')).includes('"trace_id":"trace-order"'),'Different service log formats are visible before standardization');
    await step('logs',1);check((await page.locator('.log-mapping').innerText()).includes('trace.id'),'Common field mapping explains the standard');await click('logs-apply');check(await page.locator('[data-wizard=logs] [data-step="2"]').isVisible(),'Applying standard advances to trace search');
    await select('logs-trace','trace-order');check(await text('logs-count')==='이벤트 2건'&&(await text('logs-output')).includes('"trace.id"')&&!(await text('logs-output')).includes('search-api'),'Common trace field connects matching services');check((await text('logs-explanation')).includes('시간 초과'),'Order trace identifies timeout');
    await select('logs-trace','trace-search');check((await text('logs-explanation')).includes('오류가 없습니다')&&(await text('logs-error')).includes('오류 응답이 없습니다'),'Search is separate from order error');
    await select('logs-trace','trace-order');await select('logs-protocol','grpc');check((await text('logs-error')).includes('DEADLINE_EXCEEDED (4)'),'Response example switches HTTP and gRPC');
    await page.locator('#tab-logs').focus();await page.keyboard.press('Home');check(await page.locator('#tab-dbq').getAttribute('aria-selected')==='true','Keyboard Home selects first tab');await page.keyboard.press('ArrowRight');check(await page.locator('#tab-qa').getAttribute('aria-selected')==='true','Keyboard arrows activate and focus tabs');
    await page.locator('#db-review [data-open-demo]').click();check(await page.locator('#tab-dbq').getAttribute('aria-selected')==='true','Case-study CTA opens corresponding demo');await page.locator('#logging-standards [data-open-demo]').click();check(await page.locator('#tab-logs').getAttribute('aria-selected')==='true','Each case study opens its own demo');
    for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:900});for(const name of ['dbq','qa','release','logs']){await tab(name);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px ${name}: no horizontal overflow`);}}
    await page.setViewportSize({width:390,height:700});
    const inViewport = async id => page.locator('#'+id).evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
    for(const name of ['dbq','release','logs']){await tab(name);await step(name,0);await page.locator(`[data-wizard="${name}"] [data-step-next]`).click();check(await page.locator(`[data-wizard="${name}"] [data-step="1"]`).isVisible()&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Mobile ${name} advances without overflow`);}
    await tab('qa');check(await page.locator('.qa-reference').isVisible(),'Mobile QA shows original mockup');
    await tab('release');await step('release',0);await click('release-reset');await click('release-pr');await click('release-check');check(await inViewport('release-status')&&(await text('release-status')).includes('자동으로'),'Mobile release shows automated DCR result');
    await page.setViewportSize({width:1280,height:900});
    const output=process.env.SCREENSHOT_DIR||'/tmp/career-portfolio-proof';fs.mkdirSync(output,{recursive:true});await tab('dbq');await page.locator('#demo').screenshot({path:path.join(output,'workbench-desktop.png')});await page.screenshot({path:path.join(output,'portfolio-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.locator('#demo').screenshot({path:path.join(output,'workbench-mobile.png')});await page.screenshot({path:path.join(output,'portfolio-mobile.png'),fullPage:true});
    check(interactionRequests.every(url=>url.startsWith(base)),'Workbench does not contact external services');
    await page.setViewportSize({width:1280,height:900});
    const track=page.locator('.personal-track'), cards=track.locator('.personal-card');
    check(await cards.count()===13,'Thirteen selected public projects appear without duplicates');
    check(await page.locator('.personal-track a[href*="swagger_test"], .personal-track a[href$="/mcp"], .personal-track a[href$="/career-portfolio"]').count()===0 && !(await track.innerText()).includes('비공개'),'Excluded and private projects are absent');
    check(await page.locator('[data-carousel-prev]').isDisabled()&&await page.locator('[data-carousel-next]').isEnabled(),'Carousel controls reflect initial position');
    const trackBox=await track.boundingBox(),firstBoxes=await Promise.all([0,1,2,3].map(i=>cards.nth(i).boundingBox()));
    check(firstBoxes[2].x+firstBoxes[2].width<=trackBox.x+trackBox.width+3&&firstBoxes[3].x>=trackBox.x+trackBox.width-3,'Desktop displays three projects at a time');
    await page.locator('[data-carousel-next]').click();await page.waitForTimeout(700);check(await track.evaluate(n=>n.scrollLeft)>100&&await page.locator('[data-carousel-prev]').isEnabled(),'Next button moves the project carousel');
    await page.locator('[data-carousel-prev]').click();await page.waitForTimeout(700);check(await track.evaluate(n=>n.scrollLeft)<3,'Previous button returns to first projects');
    await page.setViewportSize({width:390,height:700});await track.scrollIntoViewIfNeeded();await track.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(700);check(await track.evaluate(n=>n.scrollLeft)>100,'Mobile-width project list can be navigated by keyboard');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Project carousel does not overflow mobile page');
    const touchContext=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true});
    const touchPage=await touchContext.newPage();await touchPage.goto(new URL('#personal',base).href,{waitUntil:'networkidle'});const touchTrack=touchPage.locator('.personal-track');await touchTrack.scrollIntoViewIfNeeded();const box=await touchTrack.boundingBox();const cdp=await touchContext.newCDPSession(touchPage);const y=Math.min(650,Math.max(60,box.y+80));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:320,y}]});for(const x of [280,220,150,90])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchPage.waitForTimeout(800);check(await touchTrack.evaluate(n=>n.scrollLeft)>50,'Mobile touch swipe moves project cards');await touchContext.close();
    await page.goto(new URL('resume.html',base).href,{waitUntil:'networkidle'});check(await page.locator('.career').count()===7,'Resume preserves all seven employers');check(await page.locator('.career-project').count()>=20,'Resume keeps detailed project history');check(await page.locator('.career-detail').count()===9,'Recent projects distinguish task, implementation and validation');check(await page.locator('.resume-guide a').count()===7,'Resume has employer navigation');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile resume has no overflow');
    await page.screenshot({path:path.join(output,'resume-mobile.png'),fullPage:true});await page.emulateMedia({media:'print'});check(await page.locator('.resume-guide').evaluate(n=>getComputedStyle(n).display)==='none','Print hides interactive navigation');await page.pdf({path:path.join(output,'resume.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});check(errors.length===0,'No browser JavaScript errors');
    await page.goto(base,{waitUntil:'networkidle'});check(await text('dbq-verdict')==='—','Reload resets memory-only workbench state');
    const report={url:base,checks,errors,total:checks.length};fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2));console.log(`PASS: ${checks.length} browser checks\n`+checks.map(m=>'  ✓ '+m).join('\n'));
  }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
