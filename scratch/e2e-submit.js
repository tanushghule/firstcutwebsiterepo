// End-to-end check of real website submissions against the local FirstCut stack
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

async function fillForm(page, title) {
  const v = {
    'film-name': title, 'submitter-name': 'Asha Rao', university: 'FLAME University', email: 'e2e@example.com',
    mobile: '+91 90000 00000', origin: 'Pune, India', language: 'Hindi', 'completion-date': '2026-05-01',
    'director-name': 'A', 'cinematographer-name': 'B', 'editor-name': 'C', 'scriptwriter-name': 'D', notes: 'e2e',
  };
  for (const [k, val] of Object.entries(v)) await page.fill('#sub-' + k, val);
  await page.selectOption('#sub-category', 'Fiction');
  await page.setInputFiles('#sub-film-file', path.join(FILES, 'film.mp4'));
  for (const r of ROLES) await page.setInputFiles(`#sub-${r}-id-file`, path.join(FILES, `id-${r}.png`));
}

async function expectStored(title) {
  const c = (await admin('/api/cases')).find((x) => x.title === title);
  if (!c) throw new Error('case not in admin list: ' + title);
  if (c.stored !== 5 || c.failed || c.pending) throw new Error('want 5 stored, got ' + JSON.stringify(c));
  console.log(`  ✓ admin shows ${c.tracking_id} with 5 stored files`);
}

async function submitOnce(page, offlineMidUpload) {
  const title = `E2E ${offlineMidUpload ? 'resume' : 'plain'} ${Date.now()}`;
  await page.goto(SITE + '/#submissions');
  await fillForm(page, title);
  await page.click('#btn-submit-film-portal');
  const fb = page.locator('#film-submission-feedback');
  if (offlineMidUpload) {
    await fb.filter({ hasText: /Uploading film… [1-9]\d*%/ }).waitFor({ timeout: 120000 });
    await page.context().setOffline(true);
    console.log('  … network off mid-upload');
    await page.waitForTimeout(4000);
    if (/registered/.test(await fb.textContent())) throw new Error('claimed registered while offline');
    await page.context().setOffline(false);
    console.log('  … network back');
  }
  await fb.filter({ hasText: /FC13-[0-9A-Z]{6}/ }).waitFor({ timeout: 300000 });
  const text = await fb.textContent();
  if (!/is registered/.test(text) || !/\/manage\//.test(text)) throw new Error('unexpected success text: ' + text);
  console.log('  ✓ ' + text.slice(0, 90) + '…');
  await expectStored(title);
}

(async () => {
  if (!FILES) throw new Error('set FILES to the folder with film.mp4 and id-<role>.png');
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();
  try {
    console.log('1. plain submission');
    await submitOnce(page, false);
    console.log('2. network drops mid-upload, then resumes');
    await submitOnce(page, true);

    console.log('3. upload fails, then the filmmaker edits and resubmits');
    const title = `E2E retry ${Date.now()}`;
    await page.goto(SITE + '/#submissions');
    await fillForm(page, title);
    await page.route('**/api/uploads/**', (r) => (r.request().method() === 'PUT' ? r.fulfill({ status: 415, body: '{"error":"That file isn\'t a video file."}' }) : r.continue()));
    await page.click('#btn-submit-film-portal');
    const fb = page.locator('#film-submission-feedback');
    await fb.filter({ hasText: /manage link/ }).waitFor({ timeout: 60000 });
    if (/is registered/.test(await fb.textContent())) throw new Error('claimed registered after a refused upload');
    await page.unroute('**/api/uploads/**');
    await page.fill('#sub-film-name', title + ' (edited)');
    await page.click('#btn-submit-film-portal');
    await fb.filter({ hasText: /already/ }).waitFor({ timeout: 60000 });
    const t3 = await fb.textContent();
    if (/is registered/.test(t3) || !/\/manage\//.test(t3)) throw new Error('resubmit: ' + t3);
    console.log('  ✓ resubmit points to the manage link: ' + t3.slice(0, 70) + '…');

    console.log('4. outreach form');
    const before = (await admin('/api/inquiries?kind=outreach')).length;
    await page.goto(SITE + '/#outreach');
    await page.fill('#outreach-college', 'E2E College');
    await page.fill('#outreach-city', 'Pune');
    await page.fill('#outreach-name', 'E2E');
    await page.fill('#outreach-email', 'e2e@example.com');
    await page.check('#outreach-form input[name=collab-type][value="Media Partner"]');
    await page.check('#outreach-form input[name=collab-type][value="Campus Ambassador"]');
    await page.check('#outreach-form input[name=media-dept][value="Yes"]');
    await page.locator('#outreach-form button[type=submit]').click();
    await page.locator('#outreach-form-feedback').filter({ hasText: 'Thank you' }).waitFor({ timeout: 15000 });
    const rows = await admin('/api/inquiries?kind=outreach');
    const after = rows.length;
    if (after !== before + 1) throw new Error(`outreach rows ${before} → ${after}`);
    if (rows[0].fields['collab-type'] !== 'Media Partner, Campus Ambassador') throw new Error('checkboxes: ' + JSON.stringify(rows[0].fields));
    console.log('  ✓ outreach stored');
    console.log('ALL PASS');
  } catch (e) {
    console.error('FAIL:', e.message);
    await page.screenshot({ path: path.join(FILES, 'e2e-failure.png'), fullPage: false }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
