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
    check(await page.locator('[role=tab]').count()===4,'Four distinct workbenches available');
    await click('dbq-run');check(await text('dbq-verdict')==='PASS'&&await text('dbq-pending')==='1건','DBQ PASS with pending requester is incomplete');
    check(!await page.locator('#dbq-next-panel').isVisible(),'No guide or ticket before requester resolution');
    await select('dbq-answer','vague');await click('dbq-rerun');check(await text('dbq-pending')==='1건','Approval-like answer never substitutes for business facts');
    await select('dbq-answer','fact');check(!await page.locator('#dbq-next-panel').isVisible(),'Answer editing requires actual re-review');await click('dbq-rerun');check(await text('dbq-pending')==='0건','Re-reviewed fixture resolves requester');
    check(await text('dbq-dba')==='1건 · 별도','DBA follow-up remains independent');await click('dbq-next');check((await text('dbq-next-result')).includes('코딩 가이드'),'DDL ends in coding guide, no requester DBA approval');
    const firstBinding=await text('dbq-binding');await select('dbq-answer','');check(!await page.locator('#dbq-next-panel').isVisible(),'Answer edit revokes downstream artifacts');await click('dbq-rerun');check(await text('dbq-binding')!==firstBinding,'Re-review has a new fixture review ID');
    await select('dbq-scenario','dml');await click('dbq-run');await select('dbq-answer','fact');await click('dbq-rerun');await click('dbq-next');check((await text('dbq-next-result')).includes('미리보기')&&!(await text('dbq-next-result')).includes('DEMO-001'),'DML preview precedes explicit creation');await click('dbq-next');check((await text('dbq-next-result')).includes('DEMO-001')&&await page.locator('#dbq-next').isDisabled(),'DML explicit fixture creation happens once');
    await select('dbq-scenario','unknown');await click('dbq-run');check(await text('dbq-verdict')==='미실행','Unknown SQL does not fabricate engine result');await click('dbq-source');check(await text('dbq-badge')==='검수 전','Source fix requires a fresh review');await click('dbq-run');check(await text('dbq-pending')==='1건','Source fix does not invent business answer');
    await select('dbq-mode','pr');await select('dbq-scenario','none');await click('dbq-run');check((await text('dbq-summary')).includes('생략')&&await text('dbq-verdict')==='미실행','PR non-DB change skips SQL and SSOT jobs');
    await select('dbq-scenario','schema');await click('dbq-run');await select('dbq-answer','fact');await click('dbq-rerun');await click('dbq-next');check((await text('dbq-next-result')).includes('DBA용')&&(await text('dbq-answer-help')).includes('/dbq-answer'),'PR reports and author answers have their own route');
    await select('dbq-mode','local');check(await text('dbq-pending')==='1건','Local and PR fixture state stays isolated');await click('dbq-reset');check(await text('dbq-verdict')==='—','DBQ reset clears current scenario');
    await tab('qa');
    const qaFrame=page.frameLocator('.qa-reference');
    await qaFrame.locator('[data-s=tcreview]').click();
    check(await qaFrame.getByText('6개 중 2개 검토').isVisible(),'Original mockup opens its six-case TC review');
    check(await qaFrame.locator('.tg-mask, .tg-pop, .tg-launch, [data-skill-id=app-guide], #rb-check').count()===0,'Screen guidance and checklist are absent');
    check(await qaFrame.locator('#rb-hist').isVisible(),'Review history remains available');
    await qaFrame.locator('button').filter({hasText:/승인/}).filter({hasNotText:/승인됨/}).first().click();
    check(await qaFrame.getByText('6개 중 3개 검토').isVisible(),'Original TC approval updates review progress');
    check(await page.locator('#qa-confirm, #qa-evidence').count()===0,'Invented approval gate is removed');
    await tab('release');await page.locator('#release-form button[type=submit]').click();check((await text('release-status')).includes('3건'),'Release catches required field, ticket and duplicate problems');await page.locator('#release-note').fill('<img src=x onerror=alert(1)>');await select('release-linked','ready');await page.locator('#release-form button[type=submit]').click();check((await text('release-status')).includes('1건'),'Duplicate still blocks otherwise valid request');await select('release-repo','catalog-api');check((await text('release-status')).includes('폐기'),'Release input edits invalidate old result');await page.locator('#release-form button[type=submit]').click();check((await text('release-status')).includes('통과')&&await page.locator('#release-notice img').count()===0,'Release passes after repair and treats text as data');await click('release-reset');await click('release-example');await page.locator('#release-form button[type=submit]').click();check((await text('release-status')).includes('통과'),'Pre-filled repair example can actually pass validation');
    await tab('logs');await select('logs-trace','trace-order');await select('logs-format','ecs');check(await text('logs-count')==='이벤트 2건'&&(await text('logs-output')).includes('"trace.id"'),'Trace filtering joins events from two services');check(!(await text('logs-output')).includes('search-api'),'Unrelated trace is excluded');check((await text('logs-explanation')).includes('결제 서비스')&&(await text('logs-explanation')).includes('시간 초과'),'Order trace explains which service failed');await select('logs-trace','trace-search');check((await text('logs-explanation')).includes('오류가 없습니다')&&(await text('logs-error')).includes('오류 응답이 없습니다'),'Search trace does not inherit another request error');await select('logs-trace','trace-order');await select('logs-protocol','grpc');check((await text('logs-error')).includes('DEADLINE_EXCEEDED (4)'),'gRPC response differs from HTTP status');
    await page.locator('#tab-logs').focus();await page.keyboard.press('Home');check(await page.locator('#tab-dbq').getAttribute('aria-selected')==='true','Keyboard Home selects first tab');await page.keyboard.press('ArrowRight');check(await page.locator('#tab-qa').getAttribute('aria-selected')==='true','Keyboard arrows activate and focus tabs');
    await page.locator('#db-review [data-open-demo]').click();check(await page.locator('#tab-dbq').getAttribute('aria-selected')==='true','Case-study CTA opens corresponding demo');await page.locator('#logging-standards [data-open-demo]').click();check(await page.locator('#tab-logs').getAttribute('aria-selected')==='true','Each case study opens its own demo');
    for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:900});for(const name of ['dbq','qa','release','logs']){await tab(name);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px ${name}: no horizontal overflow`);}}
    await page.setViewportSize({width:390,height:700});
    const inViewport = async id => page.locator('#'+id).evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
    await tab('qa');check(await page.locator('.qa-reference').isVisible(),'Mobile QA shows original mockup');
    await tab('release');await click('release-reset');await page.locator('#release-form button[type=submit]').click();check(await inViewport('release-status')&&(await text('release-status')).includes('보완 3건'),'Mobile release shows validation result in viewport');
    await page.setViewportSize({width:1280,height:900});
    const output=process.env.SCREENSHOT_DIR||'/tmp/career-portfolio-proof';fs.mkdirSync(output,{recursive:true});await tab('dbq');await page.locator('#demo').screenshot({path:path.join(output,'workbench-desktop.png')});await page.screenshot({path:path.join(output,'portfolio-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.locator('#demo').screenshot({path:path.join(output,'workbench-mobile.png')});await page.screenshot({path:path.join(output,'portfolio-mobile.png'),fullPage:true});
    check(interactionRequests.every(url=>url.startsWith(base)),'Workbench does not contact external services');
    await page.goto(new URL('resume.html',base).href,{waitUntil:'networkidle'});check(await page.locator('.career').count()===7,'Resume preserves all seven employers');check(await page.locator('.career-project').count()>=20,'Resume keeps detailed project history');check(await page.locator('.career-detail').count()===9,'Recent projects distinguish task, implementation and validation');check(await page.locator('.resume-guide a').count()===7,'Resume has employer navigation');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile resume has no overflow');
    await page.screenshot({path:path.join(output,'resume-mobile.png'),fullPage:true});await page.emulateMedia({media:'print'});check(await page.locator('.resume-guide').evaluate(n=>getComputedStyle(n).display)==='none','Print hides interactive navigation');await page.pdf({path:path.join(output,'resume.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});check(errors.length===0,'No browser JavaScript errors');
    await page.goto(base,{waitUntil:'networkidle'});check(await text('dbq-verdict')==='—','Reload resets memory-only workbench state');
    const report={url:base,checks,errors,total:checks.length};fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2));console.log(`PASS: ${checks.length} browser checks\n`+checks.map(m=>'  ✓ '+m).join('\n'));
  }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
