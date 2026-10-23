/* FirstCut submissions: sends the form to the FirstCut service and uploads
   files in 50MB pieces (Cloudflare refuses anything over 100MB in one request).
   An interrupted upload resumes from the pieces already stored.

   window.FirstCutUpload.submit(payload, files, onProgress) → {tracking_id, manage_url}
   window.FirstCutUpload.uploadSlot(token, slot, file, onProgress) → resolves only
     once the server reports the file stored (also used by the /manage page). */
(() => {
  const KEY = 'firstcut.submission_key';
  const ATTEMPTS = 6;
  const PART_TIMEOUT = 10 * 60 * 1000; // a stalled connection must not hang a 4GB upload forever
  let memoryKey = null;

  // One key per submission, kept across a refresh so a resubmit finds the same
  // entry instead of making a duplicate. Storage can be blocked; fall back to memory.
  function submissionKey() {
    try {
      let k = sessionStorage.getItem(KEY);
      if (!k) { k = crypto.randomUUID(); sessionStorage.setItem(KEY, k); }
      return k;
    } catch (e) {
      return memoryKey || (memoryKey = crypto.randomUUID());
    }
  }
  function forgetKey() {
    try { sessionStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
    memoryKey = null;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const backOnline = () => (navigator.onLine ? Promise.resolve()
    : new Promise((r) => window.addEventListener('online', r, { once: true })));

  async function call(method, path, token, body) {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    if (body && !(body instanceof Blob)) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, {
      method, headers, body: body instanceof Blob ? body : body && JSON.stringify(body),
      signal: AbortSignal.timeout(PART_TIMEOUT),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  class Permanent extends Error {}

  async function sendPart(token, id, n, blob) {
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await call('PUT', `/api/uploads/${id}/parts/${n}`, token, blob);
        if (r.status === 204) return 'ok';
        if (r.status === 409 && r.json.missing) return 'restart'; // the server lost the upload: start over
        if (r.status >= 400 && r.status < 500) throw new Permanent(r.json.error || 'Upload refused.');
      } catch (e) {
        if (e instanceof Permanent || attempt >= ATTEMPTS) throw e;
      }
      if (attempt >= ATTEMPTS) throw new Error('Upload failed.');
      // Tunnel hiccups (502/524) come and go: back off up to a minute, and
      // wait out a dropped connection entirely.
      await backOnline();
      await sleep(Math.min(60000, 2000 * 2 ** (attempt - 1)));
    }
  }

  async function uploadSlot(token, slot, file, onProgress) {
    const id = slot.evidence_id;
    const size = slot.part_size;
    for (let round = 0; round < 3; round++) {
      const st = await call('GET', `/api/uploads/${id}`, token);
      if (st.status !== 200) throw new Error('This upload is no longer available.');
      if (st.json.state === 'stored') { onProgress(100); return; }
      const done = new Set(st.json.parts_done || []);
      let sent = done.size;
      let restart = false;
      // Ascending order: part 1 must go first, it starts the upload.
      for (let n = 1; n <= st.json.parts && !restart; n++) {
        if (done.has(n)) continue;
        restart = (await sendPart(token, id, n, file.slice((n - 1) * size, n * size))) === 'restart';
        onProgress(Math.min(99, Math.round((++sent / st.json.parts) * 100)));
      }
      if (restart) continue;
      const c = await call('POST', `/api/uploads/${id}/complete`, token);
      if (c.status === 200 && c.json.state === 'stored') { onProgress(100); return; }
      if (c.status !== 409) throw new Error('Could not finish the upload.');
    }
    throw new Error('Upload did not complete.');
  }

  // submit posts the form, uploads every file, and resolves only when the
  // server confirms every file is stored. A 400 rejects with err.fieldErrors;
  // a failed upload rejects with err.manageUrl so the filmmaker can resume.
  async function submit(payload, files, onProgress) {
    const r = await call('POST', '/api/submissions', null, Object.assign({ submission_key: submissionKey() }, payload));
    if (r.status === 400) throw Object.assign(new Error('Please fix the highlighted fields.'), { fieldErrors: r.json.errors || {} });
    if (r.status === 200) {
      // We already have this submission (a resubmit after a failed upload, or a
      // refresh). Its stored details and files are on the manage page; uploading
      // here would put new files into the old entry's slots under old details.
      forgetKey();
      throw Object.assign(new Error('already'), { existing: true, manageUrl: r.json.manage_url });
    }
    if (r.status !== 201) throw new Error(r.json.error || 'Could not submit. Please try again.');
    const { tracking_id, manage_url, uploads } = r.json;
    const token = manage_url.split('/manage/')[1];
    try {
      for (const slot of uploads) {
        const file = slot.kind === 'screener' ? files.screener : files[slot.role];
        const label = slot.kind === 'screener' ? 'film' : slot.role + "'s ID";
        await uploadSlot(token, slot, file, (p) => onProgress(`Uploading ${label}… ${p}%`));
      }
      const st = await call('GET', '/api/submissions/status', token);
      if (!st.json.complete) throw new Error('Not every file was stored.');
    } catch (e) {
      throw Object.assign(e, { manageUrl: manage_url });
    }
    forgetKey(); // the next submission from this tab is a new film
    return { tracking_id, manage_url };
  }

  window.FirstCutUpload = { submit, uploadSlot };
})();
