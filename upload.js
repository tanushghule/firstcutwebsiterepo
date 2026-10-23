/* FirstCut uploads, shared by the submission form (wizard.js) and the
   filmmaker's /manage page.

   Files go to the FirstCut service in 50MB pieces (Cloudflare refuses anything
   over 100MB in one request). An interrupted upload resumes from the pieces
   already stored.

   window.FirstCutUpload = {
     call(method, path, token, body) → {status, json}
     uploadSlot(token, slot, file, onProgress) → resolves once the server has the file
     FileField   one film/ID field: choose or drop a file, or paste a link
     bytes(n), day(iso)  formatting helpers
   } */
(() => {
  const ATTEMPTS = 6;
  const REQUEST_TIMEOUT = 10 * 60 * 1000; // a stalled connection must not hang a 4GB upload forever

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const backOnline = () => (navigator.onLine ? Promise.resolve()
    : new Promise((r) => window.addEventListener('online', r, { once: true })));

  async function call(method, path, token, body) {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    if (body && !(body instanceof Blob)) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, {
      method, headers, body: body instanceof Blob ? body : body && JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
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
    for (let round = 0; round < 3; round++) {
      const st = await call('GET', `/api/uploads/${id}`, token);
      if (st.status !== 200) throw new Error('This upload is no longer available.');
      if (st.json.state === 'stored') { onProgress(100); return; }
      const done = new Set(st.json.parts_done || []);
      const total = st.json.parts;
      let sent = done.size;
      let restart = false;
      // Ascending order: part 1 must go first, it starts the upload.
      for (let n = 1; n <= total && !restart; n++) {
        if (done.has(n)) continue;
        const blob = file.slice((n - 1) * slot.part_size, n * slot.part_size);
        restart = (await sendPart(token, id, n, blob)) === 'restart';
        onProgress(Math.min(99, Math.round((++sent / total) * 100)));
      }
      if (restart) continue;
      const c = await call('POST', `/api/uploads/${id}/complete`, token);
      if (c.status === 200 && c.json.state === 'stored') { onProgress(100); return; }
      if (c.status !== 409) throw new Error('Could not finish the upload.');
    }
    throw new Error('Upload did not complete.');
  }

  const bytes = (n) => {
    if (!n) return '';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
  };
  const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');

  const el = (tag, props, kids) => {
    const n = Object.assign(document.createElement(tag), props || {});
    (kids || []).forEach((k) => k != null && n.append(k));
    return n;
  };
  const ICON = {
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/></svg>',
  };
  const icon = (name) => el('span', { className: 'fc-file-icon', innerHTML: ICON[name] }); // static markup only

  /* FileField: one film or ID. It shows what the filmmaker gave us (file name,
     size, when, status) and uploads a chosen file at once, in the background.
       opts: {kind: 'screener'|'id', role, label, getToken: async () => token,
              readOnly, onChange}
       field.set(item)       show what the server has (item from GET /api/manage)
       field.status()        'empty' | 'uploading' | 'ready' | 'paused' | 'problem'
       field.settled()       resolves when no upload is running
       field.showError(msg)  a problem from the server (e.g. on submit) */
  class FileField {
    constructor(opts) {
      this.o = opts;
      this.item = null;
      this.local = null; // {name, size, pct} while this tab uploads
      this.editing = false;
      this.linkMode = false;
      this.error = '';
      this.running = Promise.resolve();
      this.el = el('div', { className: 'fc-file' });
      this.render();
    }

    set(item) { this.item = item; this.local = null; this.editing = false; this.error = ''; this.render(); }
    settled() { return this.running; }
    showError(msg) { this.error = msg; this.render(); }

    status() {
      if (this.local) return 'uploading';
      const it = this.item;
      if (!it) return 'empty';
      if (it.state === 'stored' || (it.link && it.state === 'fetching')) return 'ready';
      if (it.state === 'awaiting_upload' || it.state === 'uploading') return 'paused';
      return 'problem';
    }

    changed() { this.render(); if (this.o.onChange) this.o.onChange(this); }

    async useFile(file) {
      if (!file) return;
      const isFilm = this.o.kind === 'screener';
      const max = isFilm ? 4 * 1024 ** 3 : 20 * 1024 ** 2;
      if (file.size > max) { this.showError(isFilm ? 'Films can be up to 4 GB.' : 'ID files can be up to 20 MB.'); return; }
      this.error = '';
      this.local = { name: file.name, size: file.size, pct: 0 };
      this.changed();
      this.running = (async () => {
        try {
          const token = await this.o.getToken();
          // Picking the same file again resumes the unfinished upload.
          let slot = null;
          const it = this.item;
          if (it && (it.state === 'awaiting_upload' || it.state === 'uploading') && it.size === file.size) slot = it;
          if (!slot) {
            const r = await call('POST', '/api/manage/items', token,
              { kind: this.o.kind, role: this.o.role || '', mode: 'upload', filename: file.name, size: file.size });
            if (r.status !== 201) throw new Error(r.json.error || Object.values(r.json.errors || {})[0] || 'Could not start the upload.');
            slot = r.json;
          }
          await uploadSlot(token, slot, file, (pct) => { this.local.pct = pct; this.render(); });
          this.item = Object.assign({}, slot, { state: 'stored', filename: file.name, size: file.size, created_at: new Date().toISOString() });
          this.local = null;
          this.editing = false;
        } catch (e) {
          this.local = null;
          this.error = e.message || 'Upload failed.';
        }
        this.changed();
      })();
      return this.running;
    }

    async useLink(url, password) {
      url = url.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) { this.showError('Paste the full link, starting with https://'); return; }
      try {
        const token = await this.o.getToken();
        const r = await call('POST', '/api/manage/items', token,
          { kind: this.o.kind, role: this.o.role || '', mode: 'link', url, password: password || '' });
        if (r.status !== 201) throw new Error(r.json.error || Object.values(r.json.errors || {})[0] || 'Could not save the link.');
        this.item = Object.assign({}, r.json, { state: 'fetching', link: url, created_at: new Date().toISOString() });
        this.editing = false;
        this.linkMode = false;
        this.error = '';
      } catch (e) {
        this.error = e.message;
      }
      this.changed();
    }

    chooser() {
      const isFilm = this.o.kind === 'screener';
      const box = el('div', { className: 'fc-chooser' });
      if (this.linkMode) {
        const url = el('input', { type: 'url', className: 'form-control', placeholder: isFilm ? 'https://drive.google.com/… or https://vimeo.com/…' : 'https://drive.google.com/…' });
        const pw = isFilm ? el('input', { type: 'text', className: 'form-control', placeholder: 'Vimeo password, if it has one' }) : null;
        const use = el('button', { type: 'button', className: 'btn-gold-pill', textContent: 'Use this link' });
        const back = el('button', { type: 'button', className: 'fc-text-btn', textContent: 'Upload a file instead' });
        use.addEventListener('click', () => this.useLink(url.value, pw && pw.value));
        url.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); use.click(); } });
        back.addEventListener('click', () => { this.linkMode = false; this.render(); });
        box.append(el('div', { className: 'fc-link-row' }, [url, pw]), el('div', { className: 'fc-link-actions' }, [use, back]));
        setTimeout(() => url.focus(), 0);
        return box;
      }
      const input = el('input', { type: 'file', className: 'fc-file-input', accept: isFilm ? 'video/*' : 'image/*,application/pdf' });
      input.id = `fc-file-${this.o.role || 'film'}`;
      input.addEventListener('change', () => this.useFile(input.files[0]));
      const drop = el('label', { className: 'fc-drop', htmlFor: input.id }, [
        icon('up'),
        el('span', { className: 'fc-drop-main', textContent: this.status() === 'paused' ? 'Choose the same file to continue' : 'Choose a file' }),
        el('span', { className: 'fc-drop-sub', textContent: isFilm ? 'or drag it here · video, up to 4 GB' : 'or drag it here · photo or PDF, up to 20 MB' }),
        input,
      ]);
      ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('is-over')));
      drop.addEventListener('drop', (e) => { e.preventDefault(); this.useFile(e.dataTransfer.files[0]); });
      const linkBtn = el('button', { type: 'button', className: 'fc-text-btn', textContent: 'Paste a link instead' });
      linkBtn.addEventListener('click', () => { this.linkMode = true; this.render(); });
      box.append(drop, linkBtn);
      if (this.item && this.editing) {
        const cancel = el('button', { type: 'button', className: 'fc-text-btn', textContent: 'Keep the current one' });
        cancel.addEventListener('click', () => { this.editing = false; this.render(); });
        box.append(cancel);
      }
      return box;
    }

    row() {
      const s = this.status();
      const it = this.item || {};
      const name = this.local ? this.local.name : it.filename || it.link || 'Your file';
      const size = bytes(this.local ? this.local.size : it.size);
      let meta;
      let tag;
      if (s === 'uploading') { meta = `Uploading… ${this.local.pct}%`; tag = ['busy', `${this.local.pct}%`]; }
      else if (s === 'ready' && it.link) { meta = `Link · received ${day(it.created_at)} — we'll fetch it`; tag = ['ok', 'Received']; }
      else if (s === 'ready') { meta = `Uploaded ${day(it.created_at)}`; tag = ['ok', 'Received']; }
      else if (s === 'paused') { meta = 'Upload not finished'; tag = ['warn', 'Paused']; }
      else { meta = it.message || 'There is a problem with this file.'; tag = ['warn', 'Needs attention']; }
      const row = el('div', { className: 'fc-file-row' }, [
        icon(it.link && !this.local ? 'link' : this.o.kind === 'screener' ? 'film' : 'file'),
        el('div', { className: 'fc-file-text' }, [
          el('span', { className: 'fc-file-name', textContent: name, title: name }),
          el('span', { className: 'fc-file-meta', textContent: [size, meta].filter(Boolean).join(' · ') }),
        ]),
        el('span', { className: `fc-tag fc-tag-${tag[0]}`, textContent: tag[1] }),
      ]);
      if (s === 'uploading') {
        row.append(el('span', { className: 'fc-bar' }, [el('span', { style: `width:${this.local.pct}%` })]));
      } else if (!this.o.readOnly) {
        const change = el('button', { type: 'button', className: 'fc-text-btn', textContent: 'Change' });
        change.addEventListener('click', () => { this.editing = true; this.render(); });
        row.append(change);
      }
      return row;
    }

    render() {
      const s = this.status();
      this.el.dataset.state = s;
      const parts = [el('span', { className: 'fc-file-label', textContent: this.o.label })];
      if (s !== 'empty') parts.push(this.row());
      if (!this.o.readOnly && s !== 'uploading' && (s === 'empty' || s === 'paused' || s === 'problem' || this.editing)) parts.push(this.chooser());
      if (this.error) parts.push(el('span', { className: 'fc-error', textContent: this.error }));
      this.el.replaceChildren(...parts);
    }
  }

  window.FirstCutUpload = { call, uploadSlot, FileField, bytes, day };
})();
