(() => {
  const { SKILLS, SRC, CANDS, ROLE } = window.JEJAK;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jejak.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jejak.' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('jejak.' + k); } catch (e) {} },
  };

  /* ---------- login ----------
     Demo gate only. This is a static site: the check runs in the browser and anyone can read
     this file, so it keeps casual visitors out and nothing more. */
  const DEMO_USER = '1234', DEMO_PASS = '1234';

  function showLogin() {
    $('shell').hidden = true;
    $('login').hidden = false;
    $('loginUser').focus();
  }
  function showApp() {
    $('login').hidden = true;
    $('shell').hidden = false;
    start();
  }
  $('loginForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const u = $('loginUser').value.trim(), p = $('loginPass').value;
    const err = $('loginError');
    const btn = $('loginBtn');
    if (!u || !p) {
      err.textContent = 'Isi nama pengguna dan kata sandi.';
      err.hidden = false;
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Memeriksa…';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Masuk';
      if (u === DEMO_USER && p === DEMO_PASS) {
        err.hidden = true;
        $('loginPass').value = '';
        store.set('session', { user: u, at: Date.now() });
        showApp();
      } else {
        err.textContent = 'Nama pengguna atau kata sandi salah.';
        err.hidden = false;
        $('loginPass').setAttribute('aria-invalid', 'true');
        $('loginPass').select();
      }
    }, 350);
  });
  $('loginPass').addEventListener('input', () => $('loginPass').removeAttribute('aria-invalid'));
  $('logoutBtn').addEventListener('click', () => {
    store.del('session');
    closeSheet();
    showLogin();
  });

  /* ---------- scoring ---------- */
  const off = store.get('consentOff', {});       // { candId: ['K', ...] } sources a candidate switched off
  const enabled = (c, s) => !(off[c.id] || []).includes(s);
  // Proven level scales with the share of source trust still switched on for that skill.
  const evLevel = (c, k) => {
    const linked = c.ev.filter(e => e.k.includes(k));
    const all = linked.reduce((a, e) => a + SRC[e.s].trust, 0);
    const on = linked.filter(e => enabled(c, e.s)).reduce((a, e) => a + SRC[e.s].trust, 0);
    return all ? Math.round(c.evidence[k] * on / all) : 0;
  };
  const SW = SKILLS.reduce((a, s) => a + s.w, 0);
  const scoreOf = (fn) => Math.round(SKILLS.reduce((a, s) => a + s.w * fn(s.id) / 5, 0) / SW * 100);
  const cvScore = (c) => scoreOf(k => c.claim[k]);
  const evScore = (c) => scoreOf(k => evLevel(c, k));
  const baseEvScore = (c) => scoreOf(k => c.evidence[k]);
  const ranks = (fn) => Object.fromEntries([...CANDS].sort((a, b) => fn(b) - fn(a)).map((c, i) => [c.id, i + 1]));

  function status(c, e) {
    if (c === 0 && e > 0) return ['hidden', 'Tersembunyi'];
    if (e === 0 && c > 0) return ['none', 'Tanpa bukti'];
    if (e >= c) return ['ok', 'Terverifikasi'];
    if (c - e >= 2) return ['over', 'Dilebih-lebihkan'];
    return ['partial', 'Sebagian'];
  }
  const colorVar = { ok: '--ok', partial: '--partial', over: '--over', hidden: '--hidden', none: '--none' };
  const pips = (n, cls) => `<span class="pips ${cls}" aria-label="${n} dari 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

  /* ---------- state & routing ---------- */
  const TITLES = { peringkat: 'Peringkat', dossier: 'Dossier', bukti: 'Bukti', izin: 'Izin kandidat' };
  const state = { mode: store.get('mode', 'es'), cand: 'sinta', srcFilter: null, izinCand: 'sinta' };
  if (state.mode !== 'cv' && state.mode !== 'es') state.mode = 'es';

  function route() {
    let name = location.hash.replace('#', '');
    if (!TITLES[name]) name = 'peringkat';
    document.querySelectorAll('.screen').forEach(s => { s.hidden = s.dataset.screen !== name; });
    document.querySelectorAll('.tabbar a').forEach(a => {
      if (a.dataset.tab === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('screenTitle').textContent = TITLES[name];
    window.scrollTo(0, 0);
    render(name);
  }
  function render(name) {
    if (name === 'peringkat') renderRank();
    if (name === 'dossier') renderDossier();
    if (name === 'bukti') renderFeed();
    if (name === 'izin') renderIzin();
  }
  const current = () => (document.querySelector('.screen:not([hidden])') || {}).dataset?.screen;

  /* ---------- peringkat ---------- */
  const ROW = 106;
  function renderRank() {
    const box = $('rank');
    const RCV = ranks(cvScore), REV = ranks(evScore);
    const R = state.mode === 'cv' ? RCV : REV;
    box.style.height = (CANDS.length * ROW - 10) + 'px';
    if (!box.children.length) {
      CANDS.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'rcard'; b.dataset.id = c.id;
        b.innerHTML = `<span class="pos num"></span><span class="nm">${esc(c.name)}</span><span class="sc num"></span>
          <span class="tag">${esc(c.tag)}</span>
          <span class="sub"><span class="bar"><i></i></span><span class="delta"></span></span>`;
        b.addEventListener('click', () => { state.cand = c.id; location.hash = 'dossier'; });
        box.appendChild(b);
      });
    }
    [...box.children].forEach(b => {
      const c = CANDS.find(x => x.id === b.dataset.id);
      const r = R[c.id], v = state.mode === 'cv' ? cvScore(c) : evScore(c);
      b.style.transform = `translateY(${(r - 1) * ROW}px)`;
      b.classList.toggle('ev', state.mode === 'es');
      b.setAttribute('aria-label', `${c.name}, peringkat ${r}, skor ${v}. Buka dossier`);
      b.querySelector('.pos').textContent = r;
      b.querySelector('.sc').textContent = v;
      b.querySelector('.bar i').style.width = v + '%';
      const d = b.querySelector('.delta');
      if (state.mode === 'es') {
        const diff = RCV[c.id] - r;
        d.className = 'delta ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'same');
        d.textContent = diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '=';
      } else { d.className = 'delta same'; d.textContent = ''; }
    });
    document.querySelectorAll('.seg button').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.mode === state.mode)));
    $('rankHint').textContent = state.mode === 'es'
      ? 'Diurutkan dari bukti. Panah menunjukkan perubahan dari peringkat CV.'
      : 'Diurutkan dari klaim di CV, seperti filter kata kunci biasa.';
  }
  document.querySelectorAll('.seg button').forEach(btn => btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode; store.set('mode', state.mode); renderRank();
  }));

  /* ---------- chips ---------- */
  function candChips(el, key, onPick) {
    el.innerHTML = CANDS.map(c => `<button type="button" class="chip" role="tab" data-id="${c.id}" aria-selected="${c.id === state[key]}">${esc(c.name.split(' ')[0])}</button>`).join('');
    el.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { state[key] = ch.dataset.id; onPick(); }));
    const sel = el.querySelector('[aria-selected="true"]');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /* ---------- dossier ---------- */
  function graphSvg(c) {
    const cs = getComputedStyle(document.documentElement);
    const col = (v) => cs.getPropertyValue(v).trim();
    const CX = 180, CY = 165, R1 = 104;
    let h = '';
    const pos = SKILLS.map((s, i) => {
      const a = -Math.PI / 2 + i * (2 * Math.PI / SKILLS.length);
      return { s, a, x: CX + R1 * Math.cos(a), y: CY + R1 * Math.sin(a) };
    });
    pos.forEach(p => { h += `<line x1="${CX}" y1="${CY}" x2="${p.x}" y2="${p.y}" stroke="${col('--line')}"/>`; });
    h += `<circle cx="${CX}" cy="${CY}" r="26" fill="${col('--ink')}"/>`;
    h += `<text x="${CX}" y="${CY + 5}" text-anchor="middle" style="fill:${col('--bg')};font-family:var(--display);font-weight:800;font-size:15px">${c.name.split(' ').map(w => w[0]).join('')}</text>`;
    pos.forEach(p => {
      const cl = c.claim[p.s.id], e = evLevel(c, p.s.id);
      const [st] = status(cl, e);
      const rc = 6 + cl * 2.8, re = e ? 4 + e * 2.8 : 0;
      const r = Math.max(rc, re, 7);
      const below = Math.sin(p.a) > -0.2;
      const ly = below ? p.y + r + 13 : p.y - r - 17;
      h += `<g data-sk="${p.s.id}" style="cursor:pointer">`;
      h += `<circle cx="${p.x}" cy="${p.y}" r="${r + 8}" fill="transparent"/>`;
      h += `<circle cx="${p.x}" cy="${p.y}" r="${rc}" fill="${col('--surface')}" stroke="${col('--claim')}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
      h += re ? `<circle cx="${p.x}" cy="${p.y}" r="${re}" fill="${col(colorVar[st])}" opacity=".9"/>` : `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${col('--none')}"/>`;
      h += `<text x="${p.x}" y="${ly}" text-anchor="middle" style="font-size:11px;font-weight:600">${esc(p.s.name)}</text>`;
      h += `<text class="lvl" x="${p.x}" y="${ly + 12}" text-anchor="middle" style="font-size:9.5px">${e}/${cl}</text></g>`;
    });
    return `<svg class="graph" viewBox="0 0 360 330" role="img" aria-label="Grafik klaim dan bukti ${esc(c.name)}">${h}</svg>`;
  }
  function renderDossier() {
    candChips($('dossierChips'), 'cand', renderDossier);
    const c = CANDS.find(x => x.id === state.cand);
    const cv = cvScore(c), es = evScore(c), gap = cv - es;
    $('dossier').innerHTML = `
      <div style="display:grid;gap:14px">
        <div class="dhead"><h2>${esc(c.name)}</h2><p>${esc(c.tag)}</p></div>
        <div class="trio">
          <div><span class="label">Skor CV</span><b>${cv}</b></div>
          <div class="ev"><span class="label">Bukti</span><b>${es}</b></div>
          <div><span class="label">Selisih</span><b style="color:var(${gap > 15 ? '--over' : gap < 0 ? '--hidden' : '--ink'})">${gap > 0 ? '−' : '+'}${Math.abs(gap)}</b></div>
        </div>
        <div class="agent"><span class="label">Rekomendasi agen</span>${esc(c.agent)}</div>
        <div class="card">
          ${graphSvg(c)}
          <div class="legend"><span class="key"><span class="sw-c"></span>Klaim CV</span><span class="key"><span class="sw-e"></span>Level terbukti</span><span>Ketuk keahlian untuk buktinya</span></div>
        </div>
        <div class="section-title"><span class="label">Buku klaim</span><span class="label">${SKILLS.length} keahlian</span></div>
        <ul class="list">${SKILLS.map(s => {
          const cl = c.claim[s.id], e = evLevel(c, s.id);
          const [st, lbl] = status(cl, e);
          return `<li><button type="button" class="row" data-sk="${s.id}">
            <span class="t">${esc(s.name)} <span class="label">×${s.w}</span></span><span class="pill st-${st}">${lbl}</span>
            <span class="lv"><span>CV ${cl ? pips(cl, 'c') : 'tidak ditulis'}</span><span>Bukti ${pips(e, 'e')}</span></span>
          </button></li>`;
        }).join('')}</ul>
      </div>`;
    $('dossier').querySelectorAll('[data-sk]').forEach(el => el.addEventListener('click', () => openSkill(c, el.dataset.sk)));
  }
  function evItem(e, c) {
    return `<div class="ev-item">
      <div class="top"><span class="src"><span class="badge ${e.str}">${e.s}</span>${esc(SRC[e.s].name)}</span><span class="label">${esc(e.str)}</span></div>
      <span class="t">${esc(e.t)}</span>
      <p>${esc(e.d)}</p>
      ${c ? `<span class="who">${esc(c.name)} · ${esc(e.when)}</span>` : `<span class="who">${esc(e.when)}</span>`}
    </div>`;
  }
  function openSkill(c, k) {
    const s = SKILLS.find(x => x.id === k);
    const cl = c.claim[k], e = evLevel(c, k);
    const [st, lbl] = status(cl, e);
    const items = c.ev.filter(x => x.k.includes(k) && enabled(c, x.s));
    openSheet(s.name, `
      <div class="card" style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px;align-items:center">
        <span class="label">Status</span><span><span class="pill st-${st}">${lbl}</span></span>
        <span class="label">Klaim CV</span>${cl ? pips(cl, 'c') : '<span class="hint">tidak ditulis</span>'}
        <span class="label">Terbukti</span>${pips(e, 'e')}
      </div>
      ${items.length ? `<ul class="list">${items.map(x => `<li>${evItem(x)}</li>`).join('')}</ul>` : '<p class="empty">Belum ada bukti untuk keahlian ini.</p>'}`);
  }

  /* ---------- bukti feed ---------- */
  function renderFeed() {
    const chips = $('srcChips');
    chips.innerHTML = [`<button type="button" class="chip" data-s="" aria-pressed="${!state.srcFilter}">Semua</button>`]
      .concat(Object.entries(SRC).map(([k, v]) => `<button type="button" class="chip" data-s="${k}" aria-pressed="${state.srcFilter === k}">${esc(v.name)}</button>`)).join('');
    chips.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { state.srcFilter = ch.dataset.s || null; renderFeed(); }));
    const rows = [];
    CANDS.forEach(c => c.ev.forEach(e => { if (enabled(c, e.s) && (!state.srcFilter || e.s === state.srcFilter)) rows.push({ c, e }); }));
    const age = (w) => w === 'Hari ini' ? 0 : w === 'Kemarin' ? 1 : parseInt(w, 10) || 9;
    rows.sort((a, b) => age(a.e.when) - age(b.e.when));
    $('feed').innerHTML = rows.length
      ? rows.map(({ c, e }) => `<li>${evItem(e, c)}</li>`).join('')
      : '<li class="empty">Belum ada bukti dari sumber ini.</li>';
  }

  /* ---------- izin (candidate view) ---------- */
  const audit = store.get('audit', null) || [
    { t: '09.12', m: 'Agen membaca transkrip wawancara teknis.' },
    { t: '08.40', m: 'Referensi terstruktur diterima dari lead sebelumnya.' },
    { t: 'Kmrn', m: 'Kandidat membuka akses ke 1 repositori publik.' },
  ];
  function log(m) {
    const d = new Date();
    audit.unshift({ t: `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`, m });
    audit.length = Math.min(audit.length, 20);
    store.set('audit', audit);
  }
  function renderIzin() {
    candChips($('izinChips'), 'izinCand', renderIzin);
    const c = CANDS.find(x => x.id === state.izinCand);
    const used = [...new Set(c.ev.map(e => e.s))];
    const es = evScore(c), base = baseEvScore(c);
    const challengeable = SKILLS.filter(s => ['over', 'none', 'partial'].includes(status(c.claim[s.id], evLevel(c, s.id))[0]));
    $('izin').innerHTML = `
      <div style="display:grid;gap:14px">
        <p class="hint">Ini tampilan yang dilihat <b>${esc(c.name)}</b>. Matikan sumber dan skor bukti langsung dihitung ulang tanpa sumber itu.</p>
        <div class="card consent-score">
          <span class="label">Skor bukti saat ini</span><span class="was">${es !== base ? `dengan semua sumber: ${base}` : 'semua sumber aktif'}</span>
          <b>${es}</b><span></span>
        </div>
        <div class="section-title"><span class="label">Sumber yang boleh dibaca agen</span></div>
        <ul class="list">${Object.entries(SRC).map(([k, v]) => {
          const has = used.includes(k), on = has && enabled(c, k);
          return `<li class="src-row">
            <span class="t">${esc(v.name)} <span class="tr">· bobot ${v.trust.toFixed(1)}</span></span>
            <button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="Izinkan ${esc(v.name)}" data-s="${k}" ${has ? '' : 'disabled'}></button>
            <p>${has ? esc(v.reads) : 'Belum ada data dari sumber ini.'}</p>
          </li>`;
        }).join('')}</ul>
        <div class="section-title"><span class="label">Sanggah status</span></div>
        ${challengeable.length
          ? `<ul class="list">${challengeable.map(s => {
              const [st, lbl] = status(c.claim[s.id], evLevel(c, s.id));
              return `<li><button type="button" class="row" data-challenge="${s.id}"><span class="t">${esc(s.name)}</span><span class="pill st-${st}">${lbl}</span></button></li>`;
            }).join('')}</ul>`
          : '<p class="hint">Semua keahlian sudah terverifikasi. Tidak ada yang perlu disanggah.</p>'}
        <div class="section-title"><span class="label">Jejak audit</span></div>
        <ul class="list audit">${audit.map(a => `<li><time>${esc(a.t)}</time><span>${esc(a.m)}</span></li>`).join('')}</ul>
      </div>`;
    $('izin').querySelectorAll('.switch').forEach(sw => sw.addEventListener('click', () => {
      const k = sw.dataset.s, list = off[c.id] || (off[c.id] = []);
      const nowOn = list.includes(k);
      if (nowOn) list.splice(list.indexOf(k), 1); else list.push(k);
      store.set('consentOff', off);
      log(`${c.name.split(' ')[0]} ${nowOn ? 'mengizinkan' : 'mencabut izin'} ${SRC[k].name.toLowerCase()}.`);
      renderIzin();
      toast(nowOn ? `${SRC[k].name} diizinkan` : `Izin ${SRC[k].name.toLowerCase()} dicabut`);
    }));
    $('izin').querySelectorAll('[data-challenge]').forEach(el => el.addEventListener('click', () => openChallenge(c, el.dataset.challenge)));
  }
  function openChallenge(c, k) {
    const s = SKILLS.find(x => x.id === k);
    openSheet('Sanggah: ' + s.name, `
      <p class="hint">Jelaskan kenapa status ini keliru dan sertakan bukti baru, misalnya tautan repositori atau kontak referensi. Perekrut tidak memutuskan sebelum sanggahan ditinjau.</p>
      <label class="f" for="chText">Alasan dan bukti<textarea id="chText" placeholder="Contoh: saya menangani lock stok di proyek X, kodenya di …"></textarea></label>
      <button type="button" class="btn" id="chSend" disabled>Kirim sanggahan</button>`);
    const t = $('chText'), b = $('chSend');
    t.addEventListener('input', () => { b.disabled = t.value.trim().length < 10; });
    b.addEventListener('click', () => {
      b.disabled = true;
      log(`${c.name.split(' ')[0]} menyanggah status ${s.name}.`);
      closeSheet();
      renderIzin();
      toast('Sanggahan tersimpan di perangkat ini (demo)');
    });
  }

  /* ---------- sheet & toast ---------- */
  let lastFocus = null;
  function openSheet(title, html) {
    lastFocus = document.activeElement;
    $('sheetTitle').textContent = title;
    $('sheetBody').innerHTML = html;
    $('sheetBackdrop').hidden = false;
    $('sheet').hidden = false;
    $('sheetClose').focus();
  }
  function closeSheet() {
    $('sheet').hidden = true;
    $('sheetBackdrop').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('sheetClose').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  let toastTimer;
  function toast(m) {
    const t = $('toast');
    t.textContent = m; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---------- install ---------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('installBtn').hidden = false; });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) {}
    deferredPrompt = null; $('installBtn').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; toast('Jejak terpasang'); });
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !standalone && !store.get('iosHintClosed', false)) $('iosHint').hidden = false;
  $('iosHintClose').addEventListener('click', () => { $('iosHint').hidden = true; store.set('iosHintClosed', true); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* ---------- boot ---------- */
  store.del('preferWeb');
  $('eyebrow').textContent = ROLE;
  window.addEventListener('scroll', () => document.querySelector('.appbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
  let started = false;
  function start() {
    if (!started) { started = true; window.addEventListener('hashchange', route); }
    route();
  }
  const themeRedraw = () => { if (started && current() === 'dossier') renderDossier(); };
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', themeRedraw);

  if (store.get('session', null)) showApp(); else showLogin();
})();
