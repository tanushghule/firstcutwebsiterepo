/* The film submission form, in four steps. Answers save as you go and each file
   uploads the moment it's chosen, into a draft on the FirstCut service, so a
   refresh or a closed tab loses nothing. Submit turns the draft into a
   registration; only then is there a tracking ID and an email. */
(() => {
  const form = document.getElementById('custom-film-submission-form');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const feedback = $('film-submission-feedback');
  const say = (text) => { feedback.textContent = text; feedback.classList.toggle('visible', !!text); };
  if (!window.FirstCutUpload) {
    // Never let the browser submit the form itself: it would put the details in the URL.
    form.addEventListener('submit', (e) => { e.preventDefault(); say("Couldn't load the uploader — please reload the page."); });
    return;
  }
  const { call, FileField } = window.FirstCutUpload;

  // The draft's private code lives in this browser only.
  const KEY = 'firstcut.draft';
  const saved = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: the draft lasts this visit */ } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
  };
  let token = saved.get();
  let creating = null;
  async function getToken() {
    if (token) return token;
    creating = creating || (async () => {
      const r = await call('POST', '/api/drafts', null, { submission_key: crypto.randomUUID() });
      if (r.status !== 201 && r.status !== 200) throw new Error(r.json.error || 'Could not start your entry. Please try again.');
      token = r.json.token;
      saved.set(token);
      return token;
    })().finally(() => { creating = null; });
    return creating;
  }

  const steps = [...form.querySelectorAll('.fc-step')];
  const stepper = [...form.querySelectorAll('.fc-stepper li')];
  const inputs = [...form.querySelectorAll('.fc-step [id^="sub-"]')];
  const keyOf = (input) => input.id.slice(4);
  const stepOf = (node) => Number(node.closest('.fc-step').dataset.step);

  // File fields: four IDs on step 3, the film and optional subtitles on step 4.
  const files = {};
  const fileKey = (kind, role) => (kind === 'id' ? `${role}-id` : kind);
  const isID = (k) => k.endsWith('-id');
  form.querySelectorAll('.fc-file-slot').forEach((slot) => {
    const f = new FileField({
      kind: slot.dataset.kind, role: slot.dataset.role || '', label: slot.dataset.label,
      getToken, onChange: () => { markSaved(); if (current === 4) summary(); },
    });
    files[fileKey(slot.dataset.kind, slot.dataset.role)] = f;
    slot.replaceChildren(f.el);
  });

  let current = 1;
  let reached = 1;
  function show(n, scroll = true) {
    current = n;
    reached = Math.max(reached, n);
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    stepper.forEach((li) => {
      const k = Number(li.dataset.step);
      li.classList.toggle('is-current', k === n);
      li.classList.toggle('is-done', k < n || (k <= reached && k !== n));
      li.querySelector('button').disabled = k > reached;
    });
    $('fc-back').hidden = n === 1;
    $('fc-next').hidden = n === 4;
    $('btn-submit-film-portal').hidden = n !== 4;
    say('');
    if (n === 4) summary();
    if (scroll) form.closest('#film-submission-form-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  stepper.forEach((li) => li.querySelector('button').addEventListener('click', () => show(Number(li.dataset.step))));
  $('fc-back').addEventListener('click', () => show(current - 1));

  function clearErrors() { form.querySelectorAll('.form-group .fc-error').forEach((n) => n.remove()); }
  function fieldError(key, msg) {
    const input = $('sub-' + key);
    if (input) {
      input.closest('.form-group').append(Object.assign(document.createElement('span'), { className: 'fc-error', textContent: msg }));
      return stepOf(input);
    }
    if (files[key]) { files[key].showError(msg); return isID(key) ? 3 : 4; }
    say(msg);
    return current;
  }

  let savedTimer;
  function markSaved() {
    $('fc-saved').textContent = '✓ Saved';
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { $('fc-saved').textContent = ''; }, 2500);
  }

  // save sends the given fields. Returns the server's field errors ({} if none).
  async function save(list) {
    const body = {};
    list.forEach((i) => { body[keyOf(i)] = i.value.trim(); });
    const r = await call('PATCH', '/api/manage/fields', await getToken(), body);
    if (r.status === 200) { markSaved(); return {}; }
    return r.json.errors || { form: r.json.error || "Couldn't save — please try again." };
  }

  // Quiet autosave once a draft exists: a second after typing stops, and on
  // leaving a field, so a refresh keeps what was typed.
  inputs.forEach((i) => {
    let t;
    const autosave = () => { clearTimeout(t); if (token && i.checkValidity()) save([i]).catch(() => {}); };
    i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(autosave, 900); });
    i.addEventListener('change', autosave);
  });

  $('fc-next').addEventListener('click', async () => {
    clearErrors();
    const mine = inputs.filter((i) => stepOf(i) === current);
    const bad = mine.find((i) => !i.checkValidity());
    if (bad) { bad.reportValidity(); return; }
    if (current === 3) {
      const missing = Object.entries(files).filter(([k, f]) => isID(k) && ['empty', 'problem'].includes(f.status()));
      if (missing.length) { missing.forEach(([, f]) => f.showError('Upload the ID card or paste a link.')); return; }
    }
    const next = $('fc-next');
    next.disabled = true;
    next.textContent = 'Saving…';
    try {
      const errs = await save(mine);
      if (Object.keys(errs).length) { Object.entries(errs).forEach(([k, m]) => fieldError(k, m)); return; }
      show(current + 1);
    } catch (e) {
      say(e.message || "Couldn't save — check your connection and try again.");
    } finally {
      next.disabled = false;
      next.textContent = 'Continue →';
    }
  });

  // summary: what will be submitted, with a way back to each step.
  function summary() {
    const box = $('fc-summary');
    const groups = [1, 2, 3].map((n) => {
      const rows = inputs.filter((i) => stepOf(i) === n && i.value.trim()).map((i) => {
        const label = form.querySelector(`label[for="${i.id}"]`).firstChild.textContent.trim();
        const value = i.tagName === 'SELECT' ? i.options[i.selectedIndex].text : i.value.trim();
        return [label, value];
      });
      if (n === 3) {
        Object.entries(files).filter(([k]) => isID(k)).forEach(([k, f]) => {
          const it = f.item;
          rows.push([`${k[0].toUpperCase()}${k.slice(1).replace('-id', '')}'s ID`, f.status() === 'uploading' ? 'Uploading…' : it ? it.filename || it.link : 'Missing']);
        });
      }
      const edit = Object.assign(document.createElement('button'), { type: 'button', className: 'fc-text-btn', textContent: 'Edit' });
      edit.addEventListener('click', () => show(n));
      const head = document.createElement('div');
      head.className = 'fc-summary-head';
      head.append(Object.assign(document.createElement('span'), { textContent: steps[n - 1].querySelector('legend').textContent }), edit);
      const dl = document.createElement('dl');
      rows.forEach(([k, v]) => dl.append(
        Object.assign(document.createElement('dt'), { textContent: k }),
        Object.assign(document.createElement('dd'), { textContent: v })));
      const g = document.createElement('div');
      g.className = 'fc-summary-group';
      g.append(head, dl);
      return g;
    });
    box.replaceChildren(Object.assign(document.createElement('p'), { className: 'fc-summary-title', textContent: 'Check your entry' }), ...groups);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    const button = $('btn-submit-film-portal');
    button.disabled = true;
    try {
      if (files.screener.status() === 'empty') { files.screener.showError('Upload your film or paste a link.'); return; }
      const busy = Object.values(files).filter((f) => f.status() === 'uploading');
      if (busy.length) {
        say('Finishing your uploads — keep this page open…');
        await Promise.all(busy.map((f) => f.settled()));
      }
      say('Submitting…');
      const errs = await save(inputs);
      if (!Object.keys(errs).length) {
        const r = await call('POST', '/api/drafts/submit', await getToken());
        if (r.status === 200) { done(r.json); return; }
        Object.assign(errs, r.json.errors || { form: r.json.error || "Couldn't submit — please try again." });
      }
      const first = Math.min(...Object.entries(errs).map(([k, m]) => fieldError(k, m)));
      if (first !== current) show(first);
      if (!feedback.textContent) say('Please fix the highlighted fields.');
    } catch (err) {
      say(err.message || "Couldn't submit — check your connection and try again.");
    } finally {
      button.disabled = false;
    }
  });

  function done(res) {
    saved.clear();
    token = null;
    form.hidden = true;
    $('fc-done-title').textContent = `"${$('sub-film-name').value.trim()}" is registered`;
    $('fc-done-id').textContent = res.tracking_id;
    const link = $('fc-done-link');
    link.href = res.manage_url;
    link.textContent = res.manage_url;
    $('fc-done').hidden = false;
    feedback.textContent = `✓ "${$('sub-film-name').value.trim()}" is registered. Tracking ID: ${res.tracking_id}.`;
    $('fc-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('fc-copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('fc-done-link').href); $('fc-copy-link').textContent = 'Copied'; } catch (e) { /* select it manually */ }
  });
  function startOver() {
    saved.clear();
    token = null;
    form.reset();
    clearErrors();
    Object.values(files).forEach((f) => f.set(null));
    $('fc-resume-note').hidden = true;
    reached = 1;
    form.hidden = false;
    $('fc-done').hidden = true;
    show(1);
  }
  $('fc-another').addEventListener('click', startOver);
  $('fc-start-over').addEventListener('click', startOver);

  // Leaving mid-upload loses only the unsent part, but say so.
  window.addEventListener('beforeunload', (e) => {
    if (Object.values(files).some((f) => f.status() === 'uploading')) e.preventDefault();
  });

  // Coming back: restore the draft's answers and files, and open the first
  // step that still needs something.
  async function resume() {
    if (!token) return show(1, false);
    const r = await call('GET', '/api/manage', token).catch(() => null);
    if (!r || r.status !== 200 || r.json.stage !== 'draft') { saved.clear(); token = null; return show(1, false); }
    inputs.forEach((i) => { if (r.json.fields[keyOf(i)]) i.value = r.json.fields[keyOf(i)]; });
    r.json.items.forEach((it) => { const f = files[fileKey(it.kind, it.role)]; if (f) f.set(it); });
    const ok = (n) => inputs.filter((i) => stepOf(i) === n).every((i) => i.checkValidity());
    const idsOk = Object.entries(files).every(([k, f]) => !isID(k) || ['ready', 'paused'].includes(f.status()));
    let n = 1;
    while (n < 4 && ok(n) && (n !== 3 || idsOk)) n++;
    reached = n;
    $('fc-resume-note').hidden = false;
    show(n, false);
  }
  resume();
})();
