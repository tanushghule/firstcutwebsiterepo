// End-to-end check of website submissions against the local FirstCut stack
// (firstcutregistration: `docker compose up -d firstcut`). Run through the
// playwright skill:  node run.js ~/firstcutwebsiterepo/scratch/e2e-submit.js
//
// Env: SITE (default http://localhost:8080), FILES (dir with film.mp4 and
// id-<role>.png; make film.mp4 ≥100MB so it uploads in several parts).
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const SITE = process.env.SITE || 'http://localhost:8080';
const FILES = process.env.FILES;
const ROLES = ['director', 'cinematographer', 'editor', 'scriptwriter'];

// The admin API answers only on the admin host; Node can't resolve
// admin.localhost, so send the Host header to the same port.
function admin(p) {
  const u = new URL(SITE);
  return new Promise((resolve, reject) => {
    http.get({ host: u.hostname, port: u.port, path: p, headers: { Host: 'admin.' + u.host } }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => (res.statusCode === 200 ? resolve(JSON.parse(b)) : reject(new Error(p + ' → ' + res.statusCode))));
    }).on('error', reject);
  });
}

async function next(page, step) {
  await page.click('#fc-next');
  await page.locator(`.fc-step[data-step="${step}"]`).waitFor();
}

// steps1to3 fills the first three steps, uploading the four IDs.
async function steps1to3(page, title) {
  const you = { 'submitter-name': 'Asha Rao', university: 'FLAME University', email: 'e2e@example.com', mobile: '+91 90000 00000', origin: 'Pune, India' };
  for (const [k, v] of Object.entries(you)) await page.fill('#sub-' + k, v);
  await next(page, 2);
  await page.fill('#sub-film-name', title);
  await page.selectOption('#sub-category', 'Fiction');
  await page.fill('#sub-language', 'Hindi');
  await page.fill('#sub-completion-date', '2026-05-01');
  await next(page, 3);
  for (const r of ROLES) {
    await page.fill(`#sub-${r}-name`, r.toUpperCase());
    await page.setInputFiles(`#fc-file-${r}`, path.join(FILES, `id-${r}.png`));
  }
  for (const r of ROLES) await page.locator(`.fc-crew-card[data-role=${r}] .fc-tag-ok`).waitFor({ timeout: 30000 });
}

async function submitAndCheck(page, title) {
  await page.click('#btn-submit-film-portal');
  await page.locator('#fc-done-id').filter({ hasText: /FC13-[0-9A-Z]{6}/ }).waitFor({ timeout: 300000 });
  console.log(`  ✓ registered ${await page.textContent('#fc-done-id')} — ${await page.textContent('#fc-done-title')}`);
  const c = (await admin('/api/cases')).find((x) => x.title === title);
  if (!c || c.stored !== 5 || c.failed || c.pending) throw new Error('want 5 stored, got ' + JSON.stringify(c));
  console.log('  ✓ admin shows 5 stored files');
  return page.getAttribute('#fc-done-link', 'href');
}

(async () => {
  if (!FILES) throw new Error('set FILES to the folder with film.mp4 and id-<role>.png');
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  try {
    console.log('1. the four steps, start to finish');
    let title = `E2E steps ${Date.now()}`;
    await page.goto(SITE + '/#submissions');
    await steps1to3(page, title);
    await next(page, 4);
    await page.setInputFiles('#fc-file-film', path.join(FILES, 'film.mp4'));
    const manage = await submitAndCheck(page, title);

    console.log('2. a reload mid-way keeps answers and files; the network drops during the film upload');
    await page.click('#fc-another');
    title = `E2E resume ${Date.now()}`;
    await steps1to3(page, title);
    await page.waitForTimeout(1500); // the last typed name autosaves a second after typing stops
    await page.reload();
    await page.locator('#fc-resume-note').waitFor();
    if ((await page.inputValue('#sub-film-name')) !== title) throw new Error('answers not restored');
    if (!(await page.locator('.fc-step[data-step="4"]').isVisible())) throw new Error('did not reopen at the next step');
    await page.click('.fc-stepper li[data-step="3"] button');
    if ((await page.textContent('.fc-crew-card[data-role=director] .fc-file-name')) !== 'id-director.png') throw new Error('uploaded file not remembered');
    console.log('  ✓ answers and uploaded IDs came back after a reload');
    await page.click('.fc-stepper li[data-step="4"] button');
    await page.setInputFiles('#fc-file-film', path.join(FILES, 'film.mp4'));
    await page.locator('.fc-file-slot-film .fc-tag-busy').filter({ hasText: /[1-9]\d*%/ }).waitFor({ timeout: 120000 });
    await page.context().setOffline(true);
    await page.waitForTimeout(4000);
    await page.context().setOffline(false);
    console.log('  … network dropped for 4s mid-upload');
    await submitAndCheck(page, title);

    console.log('3. the manage page');
    await page.goto(manage);
    await page.locator('.mg-files .fc-file').first().waitFor();
    const rows = await page.locator('.mg-files .fc-file-name').allTextContents();
    if (!rows.includes('film.mp4') || !rows.includes('id-editor.png')) throw new Error('manage rows: ' + rows);
    await page.screenshot({ path: path.join(FILES, 'manage.png'), fullPage: true });
    console.log('  ✓ manage page lists the files by name');

    console.log('4. outreach form');
    const before = (await admin('/api/inquiries?kind=outreach')).length;
    await page.goto(SITE + '/#outreach');
    await page.fill('#outreach-college', 'E2E College');
    await page.fill('#outreach-city', 'Pune');
    await page.fill('#outreach-name', 'E2E');
    await page.fill('#outreach-email', 'e2e@example.com');
    await page.check('#outreach-form input[name=collab-type][value="Media Partner"]');
    await page.check('#outreach-form input[name=media-dept][value="Yes"]');
    await page.locator('#outreach-form button[type=submit]').click();
    await page.locator('#outreach-form-feedback').filter({ hasText: 'Thank you' }).waitFor({ timeout: 15000 });
    if ((await admin('/api/inquiries?kind=outreach')).length !== before + 1) throw new Error('outreach not stored');
    console.log('  ✓ outreach stored');
    console.log('ALL PASS');
  } catch (e) {
    console.error('FAIL:', e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(FILES, 'e2e-failure.png'), fullPage: false }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
