(() => {
  const { SKILLS, SRC, STAGES, CANDS, NOTIFS, ACTIVITY, LIVE, ROLE } = window.JEJAK;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jejak.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jejak.' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('jejak.' + k); } catch (e) {} },
  };
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const buzz = (p = 8) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const byId = (id) => CANDS.find(c => c.id === id);
  const initials = (c) => c.name.split(' ').map(w => w[0]).join('');
  const avatar = (c, cls = '') => `<span class="av ${cls}" style="--h:${c.hue}">${initials(c)}</span>`;
  const first = (c) => c.name.split(' ')[0];
  const fmtYears = (y) => String(y).replace('.', ',');

  /* =====================================================================
     State
     ===================================================================== */
  const S = {
    mode: store.get('mode', 'es') === 'cv' ? 'cv' : 'es',
    q: '',
    stageFilter: 'all',
    srcFilter: null,
    shortlist: new Set(store.get('shortlist', ['sinta'])),
    archived: new Set(store.get('archived', [])),
    stages: Object.assign(Object.fromEntries(CANDS.map(c => [c.id, c.stage])), store.get('stages', {})),
    off: store.get('consentOff', {}),
    notifRead: new Set(store.get('notifRead', [])),
    activity: store.get('activity', null) || ACTIVITY.slice(),
    liveIdx: store.get('liveIdx', 0),
    audit: store.get('audit', null) || [
      { t: '09.12', m: 'Agen membaca transkrip wawancara teknis.' },
      { t: '08.40', m: 'Riwayat kerja resmi dibagikan lewat ID digital.' },
      { t: 'Kmrn', m: 'Kandidat membuka akses ke 1 repositori publik.' },
    ],
    izinCand: 'sinta',
    day: null,
    interviews: store.get('interviews', null),
  };
  const save = {
    shortlist: () => store.set('shortlist', [...S.shortlist]),
    archived: () => store.set('archived', [...S.archived]),
    stages: () => store.set('stages', S.stages),
    interviews: () => store.set('interviews', S.interviews),
  };

  /* =====================================================================
     Scoring: the candidate's AI (claims) vs Jejak's AI (evidence)
     ===================================================================== */
  const enabled = (c, s) => !(S.off[c.id] || []).includes(s);
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
  const ranksBy = (fn, list) => Object.fromEntries([...list].sort((a, b) => fn(b) - fn(a)).map((c, i) => [c.id, i + 1]));
  function status(cl, e) {
    if (cl === 0 && e > 0) return ['hidden', 'Tersembunyi'];
    if (e === 0 && cl > 0) return ['none', 'Tanpa bukti'];
    if (e >= cl) return ['ok', 'Terverifikasi'];
    if (cl - e >= 2) return ['over', 'Dilebih-lebihkan'];
    return ['partial', 'Sebagian'];
  }
  const colorVar = { ok: '--ok', partial: '--partial', over: '--over', hidden: '--hidden', none: '--none' };
  const pips = (n, cls) => `<span class="pips ${cls}" aria-label="${n} dari 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const active = () => CANDS.filter(c => !S.archived.has(c.id));
  // Claims the candidate's AI made that Jejak's AI could not back up.
  const caught = (c) => SKILLS.filter(s => ['over', 'none'].includes(status(c.claim[s.id], evLevel(c, s.id))[0])).length;
  const stageName = (id) => (STAGES.find(s => s.id === id) || {}).name || id;

  /* =====================================================================
     Small animation helpers
     ===================================================================== */
  function countUp(el, to, dur = 800) {
    if (!el) return;
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (reduceMotion() || from === to) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function countAll(root) { $$('[data-count]', root).forEach(el => countUp(el, Number(el.dataset.count))); }
  function typeText(el, text, speed = 14) {
    if (!el) return;
    if (reduceMotion()) { el.textContent = text; return; }
    el.textContent = ''; el.classList.add('typing');
    let i = 0;
    const tick = () => {
      i += 2; el.textContent = text.slice(0, i);
      if (i < text.length) setTimeout(tick, speed); else el.classList.remove('typing');
    };
    setTimeout(tick, 300);
  }
  function burst(x, y) {
    if (reduceMotion()) return;
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--accent', '--rival', '--ok', '--accent-2'].map(v => cs.getPropertyValue(v).trim());
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('i');
      p.className = 'burst';
      p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.background = cols[i % cols.length];
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 40}px)) rotate(${Math.random() * 540}deg)`, opacity: 0 },
      ], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => p.remove();
    }
  }
  // FLIP: animate keyed children from their old position to their new one.
  function flip(container, mutate) {
    const before = new Map($$(':scope > [data-id]', container).filter(el => !el.hidden).map(el => [el.dataset.id, el.getBoundingClientRect()]));
    mutate();
    if (reduceMotion()) return;
    $$(':scope > [data-id]', container).forEach(el => {
      if (el.hidden) return;
      const b = before.get(el.dataset.id), a = el.getBoundingClientRect();
      if (!b) { el.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); return; }
      const dy = b.top - a.top;
      if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.9,.25,1.1)' });
    });
  }

  /* =====================================================================
     Splash + login
     Demo gate only: this is a static site, the check runs in the browser and anyone can read
     this file. It keeps casual visitors out and nothing more.
     ===================================================================== */
  const DEMO_USER = '1234', DEMO_PASS = '1234';
  let netStop = null;

  function splash() {
    return new Promise(resolve => {
      let seen = false;
      try { seen = sessionStorage.getItem('jejak.splash') === '1'; sessionStorage.setItem('jejak.splash', '1'); } catch (e) {}
      if (seen || reduceMotion()) return resolve();
      const el = $('splash');
      el.hidden = false;
      setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.hidden = true; resolve(); }, 450); }, 1900);
    });
  }

  function startNet() {
    const cv = $('loginNet');
    const ctx = cv.getContext('2d');
    let w, h, raf, nodes;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, w * h / 9000));
      nodes = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        side: i % 3 === 0 ? 'r' : 'j',
      }));
    };
    resize();
    window.addEventListener('resize', resize);
    const cs = getComputedStyle(document.documentElement);
    const ACC = cs.getPropertyValue('--accent').trim(), RIV = cs.getPropertyValue('--rival').trim(), LINE = cs.getPropertyValue('--claim').trim();
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of nodes) {
        if (!reduceMotion()) { p.x += p.vx; p.y += p.vy; }
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 110) {
            ctx.globalAlpha = (1 - d / 110) * .5;
            ctx.strokeStyle = a.side === b.side ? (a.side === 'r' ? RIV : ACC) : LINE;
            ctx.setLineDash(a.side === 'r' || b.side === 'r' ? [3, 3] : []);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.setLineDash([]);
      for (const p of nodes) {
        ctx.globalAlpha = .9; ctx.fillStyle = p.side === 'r' ? RIV : ACC;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.side === 'r' ? 2.2 : 2.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }

  async function showLogin() {
    $('shell').hidden = true;
    $('login').hidden = false;
    $('login').classList.remove('leaving');
    netStop = startNet();
    $('bioLogin').hidden = !(store.get('bioCred', null) && await bioAvailable());
    $('loginUser').focus({ preventScroll: true });
  }
  function enterApp() {
    $('login').classList.add('leaving');
    setTimeout(() => {
      if (netStop) netStop();
      $('login').hidden = true;
      $('shell').hidden = false;
      boot();
    }, reduceMotion() ? 0 : 340);
  }
  function loginFail(msg) {
    const err = $('loginError');
    err.textContent = msg; err.hidden = false;
    const card = $('loginForm');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    buzz([30, 40, 30]);
  }
  $('loginForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const u = $('loginUser').value.trim(), p = $('loginPass').value;
    const btn = $('loginBtn');
    if (!u || !p) return loginFail('Isi nama pengguna dan kata sandi.');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<span>Masuk</span>';
      if (u === DEMO_USER && p === DEMO_PASS) {
        $('loginError').hidden = true;
        $('loginPass').value = '';
        store.set('session', { user: u, at: Date.now() });
        buzz(12);
        enterApp();
      } else {
        $('loginPass').setAttribute('aria-invalid', 'true');
        loginFail('Nama pengguna atau kata sandi salah.');
      }
    }, 600);
  });
  $('loginPass').addEventListener('input', () => $('loginPass').removeAttribute('aria-invalid'));
  $('pwEye').addEventListener('click', () => {
    const show = $('loginPass').type === 'password';
    $('loginPass').type = show ? 'text' : 'password';
    $('pwEye').setAttribute('aria-pressed', String(show));
    $('pwEye').setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  /* ---------- biometrics (WebAuthn platform authenticator) ----------
     The credential stays on this device. With no server, a successful prompt proves the
     person unlocked this phone, which is all a demo gate needs. */
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
  async function bioAvailable() {
    try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
  }
  async function bioEnable() {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: rand(32),
      rp: { name: 'Jejak' },
      user: { id: rand(16), name: DEMO_USER, displayName: 'Perekrut demo' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    } });
    store.set('bioCred', b64(cred.rawId));
  }
  async function bioVerify() {
    const id = store.get('bioCred', null);
    await navigator.credentials.get({ publicKey: {
      challenge: rand(32),
      allowCredentials: [{ type: 'public-key', id: unb64(id) }],
      userVerification: 'required',
      timeout: 60000,
    } });
  }
  $('bioLogin').addEventListener('click', async () => {
    try {
      await bioVerify();
      store.set('session', { user: DEMO_USER, at: Date.now(), bio: true });
      buzz(12);
      enterApp();
    } catch (e) {
      loginFail('Verifikasi biometrik dibatalkan. Masuk dengan kata sandi.');
    }
  });

  /* =====================================================================
     Router with view transitions
     ===================================================================== */
  const TABS = { beranda: 'Beranda', kandidat: 'Kandidat', bukti: 'Bukti', jadwal: 'Jadwal', akun: 'Akun' };
  const parse = () => {
    const [tab, sub] = (location.hash.slice(1) || 'beranda').split('/');
    return TABS[tab] ? { tab, sub: sub || null } : { tab: 'beranda', sub: null };
  };
  let cur = null;
  const scrollMemo = {};

  function onRoute() {
    const prev = cur, next = parse();
    let dir = 'tab';
    if (!prev) dir = 'none';
    else if (next.sub && !prev.sub) dir = 'push';
    else if (!next.sub && prev.sub) dir = 'pop';
    else if (next.sub && prev.sub && next.sub !== prev.sub) dir = 'push';
    else if (prev.tab === next.tab && prev.sub === next.sub) dir = 'none';
    if (prev && !prev.sub) scrollMemo[prev.tab] = window.scrollY;
    if (dir === 'push') navDepth++; else if (dir === 'pop' || dir === 'tab') navDepth = Math.max(0, navDepth - (dir === 'pop' ? 1 : navDepth));
    cur = next;
    const update = () => {
      renderRoute(next);
      const y = dir === 'pop' ? (scrollMemo[next.tab] || 0) : 0;
      window.scrollTo(0, y);
      if (dir === 'pop' && prev.tab === 'kandidat' && prev.sub) {
        const av = document.querySelector(`.ccard[data-id="${prev.sub}"] .av`);
        if (av) av.style.viewTransitionName = 'hero-av';
      }
    };
    if (dir === 'none' || reduceMotion() || !document.startViewTransition) {
      update();
      if (dir !== 'none' && !reduceMotion()) {
        const el = document.querySelector('.screen:not([hidden]), .page:not([hidden])');
        if (el) { el.classList.remove('fallback-push', 'fallback-pop', 'fallback-tab'); void el.offsetWidth; el.classList.add('fallback-' + dir); }
      }
      return;
    }
    document.documentElement.dataset.nav = dir;
    if (dir === 'push' && next.tab === 'kandidat' && next.sub) {
      const av = document.querySelector(`.ccard[data-id="${next.sub}"] .av`);
      if (av) av.style.viewTransitionName = 'hero-av';
    }
    const vt = document.startViewTransition(update);
    vt.finished.finally(() => {
      $$('.ccard .av').forEach(a => { a.style.viewTransitionName = ''; });
      delete document.documentElement.dataset.nav;
    });
  }
  const go = (hash) => { if (location.hash.slice(1) === hash) onRoute(); else location.hash = hash; };

  function renderRoute(r) {
    const isPage = !!r.sub;
    $$('.screen').forEach(s => { s.hidden = isPage || s.dataset.screen !== r.tab; });
    $$('main > .page').forEach(p => { p.hidden = true; });
    $('appbar').classList.toggle('is-page', isPage);
    $('backBtn').hidden = !isPage;
    $('eyebrow').hidden = isPage;
    $('smallTitle').hidden = !isPage;
    $('tabbar').classList.toggle('away', isPage);
    $('main').classList.toggle('no-tabbar', isPage);
    $('fab').hidden = isPage || r.tab !== 'jadwal';
    $$('.tabbar a').forEach(a => { if (a.dataset.tab === r.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    moveTabInd();
    $('screenTitle').textContent = TABS[r.tab];
    $('eyebrow').textContent = r.tab === 'beranda' ? greeting() : ROLE;
    if (r.tab === 'kandidat' && r.sub && byId(r.sub)) return renderDetail(byId(r.sub));
    if (r.tab === 'akun' && r.sub === 'izin') return renderIzin();
    if (isPage) return go(r.tab);
    ({ beranda: renderBeranda, kandidat: renderKandidat, bukti: renderBukti, jadwal: renderJadwal, akun: renderAkun })[r.tab]();
  }
  function moveTabInd() {
    const a = document.querySelector('.tabbar a[aria-current="page"]');
    const ind = $('tabInd');
    if (!a) return;
    const bar = $('tabbar').getBoundingClientRect(), r = a.getBoundingClientRect();
    const w = Math.min(64, r.width - 8);
    ind.style.width = w + 'px';
    ind.style.transform = `translateX(${r.left - bar.left + (r.width - w) / 2}px)`;
  }
  // Pages pushed inside the app can go back through history; a deep link goes to its tab.
  let navDepth = 0;
  $('backBtn').addEventListener('click', () => {
    if (navDepth > 0) history.back();
    else go(cur ? cur.tab : 'beranda');
  });
  function greeting() {
    const h = new Date().getHours();
    return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';
  }

  /* =====================================================================
     Beranda
     ===================================================================== */
  function insights() {
    const list = [];
    CANDS.forEach(c => {
      if (S.archived.has(c.id)) return;
      SKILLS.forEach(s => {
        if (status(c.claim[s.id], evLevel(c, s.id))[0] === 'hidden') list.push({ c, h: 'Keahlian tersembunyi', p: `${first(c)} terbukti di ${s.name.toLowerCase()}, padahal tidak ditulis di CV.`, tone: 'st-hidden' });
      });
      if (enabled(c, 'G') && c.years.cv - c.years.verified >= 1) list.push({ c, h: 'Masa kerja tidak cocok', p: `CV: ${fmtYears(c.years.cv)} tahun. Catatan resmi: ${fmtYears(c.years.verified)} tahun.`, tone: 'st-over' });
      if (c.cvAi.adMatch >= 85) list.push({ c, h: 'CV disetel ke iklan lowongan', p: `${c.cvAi.adMatch}% kalimat CV ${first(c)} mirip iklan. Agen memeriksa lebih ketat.`, tone: 'st-partial' });
      if (SKILLS.some(s => c.claim[s.id] > 0 && evLevel(c, s.id) === 0)) list.push({ c, h: 'Perlu uji kerja', p: `${first(c)} punya klaim tanpa bukti sama sekali.`, tone: 'st-none' });
    });
    return list;
  }
  function renderBeranda() {
    const el = document.querySelector('[data-screen="beranda"]');
    const act = active();
    const claimsTotal = act.reduce((a, c) => a + SKILLS.filter(s => c.claim[s.id] > 0).length, 0);
    const caughtTotal = act.reduce((a, c) => a + caught(c), 0);
    const upcoming = (S.interviews || []).filter(iv => iv.date >= todayKey()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const ins = insights();
    el.innerHTML = `
      <div class="duel-hero">
        <span class="label">AI vs AI · minggu ini</span>
        <h2><span>AI mereka</span> menulis ${claimsTotal} klaim. <b>AI kami</b> memeriksa semuanya.</h2>
        <div class="duel-stats">
          <div class="r"><b data-count="${claimsTotal}">0</b><span class="label">klaim CV</span></div>
          <span class="vs">vs</span>
          <div class="j"><b data-count="${caughtTotal}">0</b><span class="label">tak terbukti</span></div>
        </div>
      </div>
      <div class="tiles stagger">
        <button type="button" class="tile" style="--i:0" data-go="kandidat"><span class="label">Pelamar aktif</span><b data-count="${act.length}">0</b><small>${S.shortlist.size} di shortlist</small></button>
        <button type="button" class="tile" style="--i:1" data-go="kandidat" data-stage="uji"><span class="label">Menunggu uji</span><b data-count="${act.filter(c => S.stages[c.id] === 'uji').length}">0</b><small>uji kerja 45 menit</small></button>
        <button type="button" class="tile" style="--i:2" data-go="jadwal"><span class="label">Wawancara</span><b data-count="${upcoming.length}">0</b><small>terjadwal ke depan</small></button>
        <button type="button" class="tile alert" style="--i:3" data-go="bukti"><span class="label">Dilebih-lebihkan</span><b data-count="${act.reduce((a, c) => a + SKILLS.filter(s => status(c.claim[s.id], evLevel(c, s.id))[0] === 'over').length, 0)}">0</b><small>klaim di semua CV</small></button>
      </div>
      <div class="section-title"><h3>Sorotan agen</h3><span class="label">${ins.length} temuan</span></div>
      <div class="carousel" id="carousel">${ins.map((x, i) => `
        <button type="button" class="insight" data-go="kandidat/${x.c.id}" style="--i:${i}">
          <span class="top">${avatar(x.c, 'sm')}<span class="pill ${x.tone}">${esc(x.h)}</span></span>
          <h4>${esc(x.c.name)}</h4><p>${esc(x.p)}</p><span class="go">Buka dossier →</span>
        </button>`).join('')}</div>
      <div class="dots" id="dots">${ins.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
      ${upcoming.length ? `<div class="section-title"><h3>Berikutnya</h3><a class="link" href="#jadwal">Semua</a></div>
        <ul class="list">${upcoming.slice(0, 2).map(ivRow).join('')}</ul>` : ''}
      <div class="section-title"><h3>Aktivitas agen</h3>
        <button type="button" class="refresh-btn" id="refreshBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>Pindai</button></div>
      <div class="card"><span class="live"><i></i>Agen aktif · tarik layar ke bawah untuk memindai</span>
        <ul class="timeline" id="timeline">${S.activity.slice(0, 6).map(a => `<li><time>${esc(a.t)}</time><span class="src">${a.k}</span><span class="m">${esc(a.m)}</span></li>`).join('')}</ul>
      </div>`;
    countAll(el);
    $$('[data-go]', el).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.stage) S.stageFilter = b.dataset.stage;
      go(b.dataset.go);
    }));
    bindIvRows(el);
    const car = $('carousel');
    car.addEventListener('scroll', () => {
      const i = Math.round(car.scrollLeft / (car.firstElementChild ? car.firstElementChild.getBoundingClientRect().width + 10 : 1));
      $$('#dots i').forEach((d, j) => d.classList.toggle('on', j === i));
    }, { passive: true });
    $('refreshBtn').addEventListener('click', scan);
  }
  let scanning = false;
  function scan() {
    if (scanning) return;
    scanning = true;
    const btn = $('refreshBtn');
    if (btn) btn.classList.add('busy');
    buzz(10);
    setTimeout(() => {
      const item = LIVE[S.liveIdx % LIVE.length];
      S.liveIdx++; store.set('liveIdx', S.liveIdx);
      const d = new Date();
      const t = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
      S.activity.unshift({ t, m: item.m, k: item.k });
      S.activity.length = Math.min(S.activity.length, 12);
      store.set('activity', S.activity);
      const tl = $('timeline');
      if (tl) {
        const li = document.createElement('li');
        li.className = 'new';
        li.innerHTML = `<time>${t}</time><span class="src">${item.k}</span><span class="m">${esc(item.m)}</span>`;
        tl.prepend(li);
        if (tl.children.length > 6) tl.lastElementChild.remove();
      }
      if (btn) btn.classList.remove('busy');
      endPtr();
      scanning = false;
      toast('Agen menemukan 1 bukti baru');
      buzz([8, 30, 8]);
    }, 1300);
  }

  /* pull to refresh (Beranda only) */
  let ptrStart = null, ptrDy = 0;
  const ptr = $('ptr');
  window.addEventListener('touchstart', (e) => {
    if (!cur || cur.tab !== 'beranda' || cur.sub || window.scrollY > 0 || scanning || !$('sheet').hidden) return;
    ptrStart = e.touches[0].clientY; ptrDy = 0;
    ptr.classList.remove('settle', 'loading');
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (ptrStart === null) return;
    ptrDy = Math.max(0, e.touches[0].clientY - ptrStart);
    const d = Math.min(120, ptrDy * .55);
    ptr.style.opacity = Math.min(1, d / 50);
    ptr.style.transform = `translate(-50%, ${d - 80}px)`;
    ptr.style.setProperty('--r', d * 4 + 'deg');
    ptr.querySelector('.ptr-text').textContent = d > 60 ? 'Lepas untuk memindai' : 'Tarik untuk memindai';
  }, { passive: true });
  window.addEventListener('touchend', () => {
    if (ptrStart === null) return;
    ptrStart = null;
    ptr.classList.add('settle');
    if (ptrDy * .55 > 60) {
      ptr.classList.add('loading');
      ptr.style.transform = 'translate(-50%, -10px)';
      ptr.querySelector('.ptr-text').textContent = 'Agen memindai sumber…';
      scan();
    } else endPtr();
  });
  function endPtr() { ptr.classList.add('settle'); ptr.classList.remove('loading'); ptr.style.opacity = 0; ptr.style.transform = 'translate(-50%, -80px)'; }

  /* =====================================================================
     Kandidat list: FLIP reorder + swipe actions
     ===================================================================== */
  function renderKandidat() {
    const chips = $('stageChips');
    const act = active();
    const opts = [['all', 'Semua', act.length], ['shortlist', '★ Shortlist', act.filter(c => S.shortlist.has(c.id)).length]]
      .concat(STAGES.map(s => [s.id, s.name, act.filter(c => S.stages[c.id] === s.id).length]))
      .concat([['arsip', 'Arsip', S.archived.size]]);
    chips.innerHTML = opts.map(([id, n, k]) => `<button type="button" class="chip" data-f="${id}" aria-pressed="${S.stageFilter === id}">${esc(n)} <span class="n">${k}</span></button>`).join('');
    $$('.chip', chips).forEach(ch => ch.addEventListener('click', () => { S.stageFilter = ch.dataset.f; buzz(5); renderKandidat(); }));
    $('modeSeg').dataset.mode = S.mode;
    $$('#modeSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
    $('rankHint').innerHTML = S.mode === 'es'
      ? 'Diurutkan oleh <b>AI Jejak</b> dari bukti. Panah: perubahan dari versi CV.'
      : 'Diurutkan dari klaim yang ditulis <b>AI kandidat</b> di CV, seperti filter kata kunci biasa.';
    renderCards();
  }
  function visibleCands() {
    const q = S.q.trim().toLowerCase();
    return CANDS.filter(c => {
      const arch = S.archived.has(c.id);
      if (S.stageFilter === 'arsip') { if (!arch) return false; } else if (arch) return false;
      if (S.stageFilter === 'shortlist' && !S.shortlist.has(c.id)) return false;
      if (STAGES.some(s => s.id === S.stageFilter) && S.stages[c.id] !== S.stageFilter) return false;
      if (q && !(c.name.toLowerCase().includes(q) || SKILLS.some(s => s.name.toLowerCase().includes(q) && (c.claim[s.id] || c.evidence[s.id])))) return false;
      return true;
    });
  }
  function renderCards() {
    const box = $('clist');
    box.dataset.mode = S.mode;
    if (!box.children.length) {
      CANDS.forEach(c => {
        const w = document.createElement('div');
        w.className = 'cwrap'; w.dataset.id = c.id;
        w.innerHTML = `<div class="swipe-bg"><span class="sl">★ Shortlist</span><span class="sr">Arsipkan</span></div>
          <div class="ccard" data-id="${c.id}" role="button" tabindex="0" aria-label="Buka dossier ${esc(c.name)}">
            ${avatar(c)}
            <div class="cmain">
              <div class="nmrow"><span class="nm">${esc(c.name)}</span><span class="star"></span></div>
              <div class="meta"><span class="stage-pill"></span><span>${esc(c.applied)}</span></div>
              <div class="tug"><i></i></div>
            </div>
            <div class="cside"><span class="pos"></span><b class="sc">0</b><span class="delta"></span></div>
          </div>`;
        box.appendChild(w);
        bindSwipe(w, c);
      });
    }
    const list = visibleCands();
    const all = active();
    const RCV = ranksBy(cvScore, all), REV = ranksBy(evScore, all);
    const R = S.mode === 'cv' ? RCV : REV;
    const sorted = [...list].sort((a, b) => (R[a.id] || 99) - (R[b.id] || 99));
    flip(box, () => {
      $$(':scope > .cwrap', box).forEach(w => { w.hidden = !sorted.some(c => c.id === w.dataset.id); });
      sorted.forEach(c => box.appendChild(box.querySelector(`.cwrap[data-id="${c.id}"]`)));
    });
    sorted.forEach(c => {
      const w = box.querySelector(`.cwrap[data-id="${c.id}"]`);
      const v = S.mode === 'cv' ? cvScore(c) : evScore(c);
      w.querySelector('.pos').textContent = R[c.id] ? '#' + R[c.id] : 'arsip';
      countUp(w.querySelector('.sc'), v, 700);
      w.querySelector('.tug i').style.width = v + '%';
      w.querySelector('.star').textContent = S.shortlist.has(c.id) ? '★' : '';
      w.querySelector('.stage-pill').textContent = stageName(S.stages[c.id]);
      const d = w.querySelector('.delta');
      if (S.mode === 'es' && R[c.id]) {
        const diff = RCV[c.id] - REV[c.id];
        d.className = 'delta ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'same');
        d.textContent = diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '=';
      } else { d.className = 'delta same'; d.textContent = ''; }
    });
    let empty = box.querySelector('.empty');
    if (!sorted.length) {
      if (!empty) { empty = document.createElement('div'); empty.className = 'empty'; box.appendChild(empty); }
      empty.innerHTML = `<svg viewBox="0 0 56 56"><rect x="6" y="6" width="44" height="44" rx="8"/></svg><span>${S.q ? `Tidak ada kandidat yang cocok dengan "${esc(S.q)}".` : 'Belum ada kandidat di sini.'}</span>`;
    } else if (empty) empty.remove();
  }
  $$('#modeSeg button').forEach(b => b.addEventListener('click', () => {
    if (S.mode === b.dataset.mode) return;
    S.mode = b.dataset.mode; store.set('mode', S.mode); buzz(8); renderKandidat();
  }));
  $('q').addEventListener('input', () => { S.q = $('q').value; renderCards(); });

  function bindSwipe(w, c) {
    const card = w.querySelector('.ccard'), bg = w.querySelector('.swipe-bg');
    let x0 = null, y0 = 0, dx = 0, swiping = false, moved = false, armed = false;
    const TH = 96;
    card.addEventListener('pointerdown', (e) => { if (e.button) return; x0 = e.clientX; y0 = e.clientY; dx = 0; swiping = false; moved = false; armed = false; });
    card.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (!swiping && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.3) {
        swiping = true; moved = true; card.setPointerCapture(e.pointerId); card.classList.add('dragging');
      }
      if (!swiping) { if (Math.abs(my) > 10) x0 = null; return; }
      dx = mx * (Math.abs(mx) > TH ? .85 : 1);
      card.style.transform = `translateX(${dx}px) rotate(${dx / 60}deg)`;
      bg.classList.toggle('right', dx > 0); bg.classList.toggle('left', dx < 0);
      const nowArmed = Math.abs(dx) > TH;
      if (nowArmed !== armed) { armed = nowArmed; bg.classList.toggle('armed', armed); if (armed) buzz(10); }
    });
    const end = () => {
      if (x0 === null) return;
      x0 = null;
      card.classList.remove('dragging');
      if (!swiping) return;
      const out = Math.abs(dx) > TH;
      if (out && dx < 0) {
        card.animate([{ transform: card.style.transform }, { transform: 'translateX(-120%) rotate(-8deg)', opacity: 0 }], { duration: 260, easing: 'ease-in' }).onfinish = () => {
          card.style.transform = ''; bg.className = 'swipe-bg'; archive(c);
        };
        return;
      }
      if (out && dx > 0) toggleShortlist(c, card);
      card.animate([{ transform: card.style.transform }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1.2)' });
      card.style.transform = '';
      setTimeout(() => { bg.className = 'swipe-bg'; }, 300);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
    card.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; return; } go('kandidat/' + c.id); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('kandidat/' + c.id); } });
  }
  function toggleShortlist(c, el) {
    const on = !S.shortlist.has(c.id);
    if (on) S.shortlist.add(c.id); else S.shortlist.delete(c.id);
    save.shortlist(); buzz(on ? [10, 40, 10] : 8);
    if (on && el) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); }
    toast(on ? `${first(c)} masuk shortlist` : `${first(c)} dikeluarkan dari shortlist`);
    if (cur && cur.tab === 'kandidat' && !cur.sub) renderKandidat();
    return on;
  }
  function archive(c) {
    S.archived.add(c.id); save.archived(); S.shortlist.delete(c.id); save.shortlist();
    renderKandidat();
    toast(`${first(c)} diarsipkan`, 'Urungkan', () => { S.archived.delete(c.id); save.archived(); renderKandidat(); });
  }

  /* =====================================================================
     Detail (dossier)
     ===================================================================== */
  function graphSvg(c) {
    const cs = getComputedStyle(document.documentElement);
    const col = (v) => cs.getPropertyValue(v).trim();
    const CX = 180, CY = 165, R1 = 104;
    let h = `<defs><linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${col('--accent')}" stop-opacity="0"/><stop offset="1" stop-color="${col('--accent')}" stop-opacity=".35"/></linearGradient></defs>`;
    h += `<circle cx="${CX}" cy="${CY}" r="${R1}" fill="none" stroke="${col('--line')}" stroke-dasharray="2 4"/>`;
    h += `<path class="sweep" d="M${CX} ${CY} L${CX + 140} ${CY} A140 140 0 0 0 ${CX + 140 * Math.cos(-0.7)} ${CY + 140 * Math.sin(-0.7)} Z" fill="url(#sw)"/>`;
    const pos = SKILLS.map((s, i) => {
      const a = -Math.PI / 2 + i * (2 * Math.PI / SKILLS.length);
      return { s, i, a, x: CX + R1 * Math.cos(a), y: CY + R1 * Math.sin(a) };
    });
    pos.forEach(p => { h += `<line class="spoke" style="--i:${p.i}" x1="${CX}" y1="${CY}" x2="${p.x}" y2="${p.y}"/>`; });
    h += `<circle cx="${CX}" cy="${CY}" r="26" fill="${col('--ink')}"/>`;
    h += `<text x="${CX}" y="${CY + 5}" text-anchor="middle" style="fill:${col('--bg')};font-family:var(--display);font-weight:800;font-size:15px">${initials(c)}</text>`;
    pos.forEach(p => {
      const cl = c.claim[p.s.id], e = evLevel(c, p.s.id);
      const [st] = status(cl, e);
      const rc = 6 + cl * 2.8, re = e ? 4 + e * 2.8 : 0, r = Math.max(rc, re, 7);
      const ly = Math.sin(p.a) > -0.2 ? p.y + r + 13 : p.y - r - 17;
      h += `<g data-sk="${p.s.id}" style="cursor:pointer" role="button" aria-label="${esc(p.s.name)}">`;
      h += `<circle cx="${p.x}" cy="${p.y}" r="${r + 10}" fill="transparent"/>`;
      h += `<g class="node" style="--i:${p.i}"><circle cx="${p.x}" cy="${p.y}" r="${rc}" fill="${col('--surface')}" stroke="${col('--rival')}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
      h += re ? `<circle cx="${p.x}" cy="${p.y}" r="${re}" fill="${col(colorVar[st])}" opacity=".9"/>` : `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${col('--none')}"/>`;
      h += `</g><g class="lbl" style="--i:${p.i}"><text x="${p.x}" y="${ly}" text-anchor="middle" style="font-size:11px;font-weight:600">${esc(p.s.name)}</text>`;
      h += `<text class="lvl" x="${p.x}" y="${ly + 12}" text-anchor="middle" style="font-size:9.5px">${e}/${cl}</text></g></g>`;
    });
    return `<svg class="graph" viewBox="0 0 360 330" role="img" aria-label="Grafik klaim dan bukti ${esc(c.name)}">${h}</svg>`;
  }
  function renderDetail(c) {
    const page = document.querySelector('[data-page="detail"]');
    page.hidden = false;
    $('smallTitle').textContent = c.name;
    const cv = cvScore(c), es = evScore(c);
    const stIdx = STAGES.findIndex(s => s.id === S.stages[c.id]);
    const sl = S.shortlist.has(c.id);
    const gShared = enabled(c, 'G');
    const caughtN = caught(c), claimN = SKILLS.filter(s => c.claim[s.id] > 0).length;
    const share = cv + es ? Math.round(es / (cv + es) * 100) : 50;
    page.innerHTML = `
      <div class="dhero">
        <span class="av lg" style="--h:${c.hue};view-transition-name:hero-av">${initials(c)}</span>
        <div><h2>${esc(c.name)}</h2><p>${esc(c.tag)} · melamar ${esc(c.applied)}</p></div>
        <button type="button" class="star-btn" id="starBtn" aria-pressed="${sl}" aria-label="Shortlist">${sl ? '★' : '☆'}</button>
      </div>
      <div class="card stepper">
        <div class="section-title" style="margin:0"><span class="label">Tahap</span>
          ${stIdx < STAGES.length - 1 ? `<button type="button" class="link" id="advance">Majukan ke ${esc(STAGES[stIdx + 1].name)} →</button>` : '<span class="pill st-ok">Tahap akhir</span>'}</div>
        <div class="steps"><span class="fill" id="stepFill"></span>${STAGES.map((s, i) => `<div class="step ${i < stIdx ? 'done' : i === stIdx ? 'cur' : ''}"><i></i>${esc(s.name)}</div>`).join('')}</div>
      </div>
      <div class="card duel">
        <span class="label">AI vs AI</span>
        <div class="duel-row">
          <div class="side r"><span class="label">AI kandidat</span><b data-count="${cv}">0</b><small class="hint">skor dari CV</small></div>
          <span class="vs">vs</span>
          <div class="side j"><span class="label">AI Jejak</span><b data-count="${es}">0</b><small class="hint">skor dari bukti</small></div>
        </div>
        <div class="rope" aria-hidden="true"><i id="rope"></i></div>
        <p class="hint"><b>${caughtN}</b> dari ${claimN} klaim CV tidak bisa dibuktikan.</p>
        <div class="ai-signals">
          <div class="sig"><span>Kemiripan dengan iklan lowongan</span><b class="num" style="color:var(${c.cvAi.adMatch >= 85 ? '--over' : c.cvAi.adMatch >= 60 ? '--partial' : '--ok'})">${c.cvAi.adMatch}%</b></div>
          ${c.cvAi.phrases.length ? `<div class="phr">${c.cvAi.phrases.map(p => `<span>${esc(p)}</span>`).join('')}</div>` : ''}
          <p class="hint">Sinyal ini tidak menurunkan skor. CV yang ditulis dengan AI boleh; yang dihitung hanya klaim yang terbukti.</p>
        </div>
      </div>
      <div class="agent"><span class="label">Rekomendasi AI Jejak</span><span id="agentText"></span></div>
      <div class="card years">
        <div class="section-title" style="margin:0"><span class="label">Masa kerja</span>
          ${gShared ? `<span class="pill ${c.years.cv - c.years.verified >= 1 ? 'st-over' : 'st-ok'}">${c.years.cv - c.years.verified >= 1 ? 'Tidak cocok' : 'Cocok'}</span>` : '<span class="pill st-none">Tidak dibagikan</span>'}</div>
        <div class="yrow"><span>CV</span><span class="ybar cv"><i data-w="${c.years.cv / 8 * 100}"></i></span><b class="num">${fmtYears(c.years.cv)} thn</b></div>
        ${gShared
          ? `<div class="yrow"><span>Resmi</span><span class="ybar ok"><i data-w="${c.years.verified / 8 * 100}"></i></span><b class="num">${fmtYears(c.years.verified)} thn</b></div>
             <p class="hint">Dari catatan iuran BPJS Ketenagakerjaan lewat ID digital, seperti Myinfo di Singapura.</p>`
          : '<p class="hint">Kandidat belum membagikan riwayat kerja resmi.</p>'}
      </div>
      <div class="card">
        ${graphSvg(c)}
        <div class="legend"><span class="key"><span class="sw-c"></span>Klaim AI kandidat</span><span class="key"><span class="sw-e"></span>Terbukti oleh AI Jejak</span><span>Ketuk keahlian</span></div>
      </div>
      <div class="section-title"><h3>Buku klaim</h3><span class="label">${SKILLS.length} keahlian</span></div>
      <ul class="list stagger">${SKILLS.map((s, i) => {
        const cl = c.claim[s.id], e = evLevel(c, s.id);
        const [st, lbl] = status(cl, e);
        return `<li style="--i:${i}"><button type="button" class="row" data-sk="${s.id}">
          <span class="t">${esc(s.name)} <span class="label">×${s.w}</span></span><span class="pill st-${st}">${lbl}</span>
          <span class="lv"><span>CV ${cl ? pips(cl, 'c') : 'tidak ditulis'}</span><span>Bukti ${pips(e, 'e')}</span></span>
        </button></li>`;
      }).join('')}</ul>
      <button type="button" class="btn ghost" id="asCand">Lihat sebagai kandidat</button>
      <div class="actionbar">
        <button type="button" class="btn ghost" id="sendTest">${S.stages[c.id] === 'baru' ? 'Kirim uji kerja' : 'Uji ulang'}</button>
        <button type="button" class="btn accent" id="schedBtn">Jadwalkan</button>
      </div>`;
    countAll(page);
    typeText($('agentText'), c.agent);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $('rope').style.width = share + '%';
      $('stepFill').style.width = (75 * stIdx / (STAGES.length - 1)) + '%';
      $$('.ybar i', page).forEach(i => { i.style.width = i.dataset.w + '%'; });
    }));
    $$('[data-sk]', page).forEach(el => el.addEventListener('click', () => openSkill(c, el.dataset.sk)));
    $('starBtn').addEventListener('click', () => {
      const on = toggleShortlist(c, $('starBtn'));
      $('starBtn').setAttribute('aria-pressed', String(on));
      $('starBtn').textContent = on ? '★' : '☆';
    });
    const adv = $('advance');
    if (adv) adv.addEventListener('click', () => {
      S.stages[c.id] = STAGES[stIdx + 1].id; save.stages(); buzz([8, 30, 8]);
      const r = adv.getBoundingClientRect(); burst(r.left + r.width / 2, r.top);
      toast(`${first(c)} maju ke tahap ${STAGES[stIdx + 1].name}`);
      renderDetail(c);
    });
    $('asCand').addEventListener('click', () => { S.izinCand = c.id; go('akun/izin'); });
    $('schedBtn').addEventListener('click', () => openSchedule(c.id));
    $('sendTest').addEventListener('click', () => openSendTest(c));
  }
  function evItem(e, c) {
    return `<div class="ev-item">
      <div class="top"><span class="src"><span class="sbadge ${e.str}">${e.s}</span>${esc(SRC[e.s].name)}</span><span class="label">${esc(e.str)}</span></div>
      <span class="t">${esc(e.t)}</span>
      <p>${esc(e.d)}</p>
      <span class="who">${c ? `${avatar(c, 'sm')}${esc(c.name)} · ` : ''}${esc(e.when)}</span>
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
        <span class="label">AI kandidat</span>${cl ? pips(cl, 'c') : '<span class="hint">tidak ditulis</span>'}
        <span class="label">AI Jejak</span>${pips(e, 'e')}
      </div>
      ${items.length ? `<ul class="list stagger">${items.map((x, i) => `<li style="--i:${i}">${evItem(x)}</li>`).join('')}</ul>` : '<p class="empty">Belum ada bukti untuk keahlian ini.</p>'}`);
  }
  function openSendTest(c) {
    openSheet('Kirim uji kerja', `
      <div class="card" style="display:grid;gap:6px">
        <span class="label">Dibuat oleh AI Jejak untuk ${esc(ROLE)}</span>
        <b style="font-size:17px">Potong stok bersamaan</b>
        <p class="hint">Perbaiki endpoint yang memotong stok agar aman saat 50 request datang bersamaan. Tulis test yang membuktikannya.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px"><span class="pill st-hidden">45 menit</span><span class="pill st-partial">Batas 48 jam</span><span class="pill st-ok">Dinilai otomatis</span></div>
      </div>
      <p class="hint">Uji ini menargetkan klaim yang belum terbukti: ${SKILLS.filter(s => c.claim[s.id] > evLevel(c, s.id)).map(s => s.name).join(', ') || 'tidak ada'}.</p>
      <button type="button" class="btn accent" id="doSend">Kirim ke ${esc(first(c))}</button>`);
    $('doSend').addEventListener('click', (e) => {
      const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin"></span>';
      setTimeout(() => {
        if (S.stages[c.id] === 'baru') { S.stages[c.id] = 'uji'; save.stages(); }
        closeSheet(); buzz([8, 30, 8]);
        toast(`Uji kerja terkirim ke ${first(c)}`);
        notify('Uji kerja terkirim', `${c.name} punya 48 jam untuk mengerjakannya.`);
        if (cur && cur.sub === c.id) renderDetail(c);
      }, 700);
    });
  }

  /* =====================================================================
     Bukti feed
     ===================================================================== */
  function renderBukti() {
    const chips = $('srcChips');
    const used = Object.keys(SRC).filter(k => CANDS.some(c => c.ev.some(e => e.s === k)));
    chips.innerHTML = [`<button type="button" class="chip" data-s="" aria-pressed="${!S.srcFilter}">Semua</button>`]
      .concat(used.map(k => `<button type="button" class="chip" data-s="${k}" aria-pressed="${S.srcFilter === k}">${esc(SRC[k].name)}</button>`)).join('');
    $$('.chip', chips).forEach(ch => ch.addEventListener('click', () => { S.srcFilter = ch.dataset.s || null; buzz(5); renderBukti(); }));
    const rows = [];
    active().forEach(c => c.ev.forEach(e => { if (enabled(c, e.s) && (!S.srcFilter || e.s === S.srcFilter)) rows.push({ c, e }); }));
    const age = (w) => w === 'Hari ini' ? 0 : w === 'Kemarin' ? 1 : parseInt(w, 10) || 9;
    rows.sort((a, b) => age(a.e.when) - age(b.e.when));
    $('feedCount').textContent = `${rows.length} bukti`;
    const feed = $('feed');
    feed.className = 'feed stagger';
    feed.innerHTML = rows.length
      ? rows.map(({ c, e }, i) => `<li style="--i:${Math.min(i, 8)}" data-c="${c.id}">${evItem(e, c)}</li>`).join('')
      : '<li class="empty">Belum ada bukti dari sumber ini.</li>';
    $$('li[data-c]', feed).forEach(li => li.addEventListener('click', () => go('kandidat/' + li.dataset.c)));
  }

  /* =====================================================================
     Jadwal
     ===================================================================== */
  const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = () => dkey(new Date());
  const days = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const weekdays = (n) => { const out = []; const d = new Date(); d.setHours(12, 0, 0, 0); while (out.length < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) out.push(new Date(d)); } return out; };
  const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const dayLabel = (k) => fromKey(k).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!S.interviews) {
    const w = weekdays(2);
    S.interviews = [
      { id: 'iv1', cand: 'sinta', date: dkey(w[0]), time: '10:00', mode: 'Video' },
      { id: 'iv2', cand: 'dimas', date: dkey(w[1]), time: '14:00', mode: 'Tatap muka' },
    ];
    save.interviews();
  }
  function ivRow(iv) {
    const c = byId(iv.cand);
    return `<li class="iv" data-iv="${iv.id}">
      <time>${iv.time}</time>
      <div class="who">${avatar(c, 'sm')}<div><b>${esc(c.name)}</b><small>${esc(iv.mode)} · ${esc(dayLabel(iv.date))}</small></div></div>
      <span class="iv-actions">
        <button type="button" class="icon-btn" data-ics="${iv.id}" aria-label="Tambah ke kalender"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M12 13v5M9.5 15.5h5"/></svg></button>
        <button type="button" class="icon-btn" data-cancel="${iv.id}" aria-label="Batalkan wawancara"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </span></li>`;
  }
  function bindIvRows(root) {
    $$('[data-ics]', root).forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); downloadIcs(S.interviews.find(x => x.id === b.dataset.ics)); }));
    $$('[data-cancel]', root).forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const iv = S.interviews.find(x => x.id === b.dataset.cancel);
      const li = b.closest('li');
      const done = () => {
        S.interviews = S.interviews.filter(x => x !== iv); save.interviews(); rerender();
        toast(`Wawancara ${first(byId(iv.cand))} dibatalkan`, 'Urungkan', () => { S.interviews.push(iv); save.interviews(); rerender(); });
      };
      if (li && !reduceMotion()) li.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 220 }).onfinish = done; else done();
    }));
    $$('li.iv', root).forEach(li => li.addEventListener('click', () => {
      const iv = S.interviews.find(x => x.id === li.dataset.iv); if (iv) go('kandidat/' + iv.cand);
    }));
  }
  function renderJadwal() {
    const ds = days(7);
    if (!S.day) S.day = (S.interviews.map(i => i.date).filter(k => k >= todayKey()).sort()[0]) || todayKey();
    $('week').innerHTML = ds.map(d => {
      const k = dkey(d), has = S.interviews.some(i => i.date === k);
      return `<button type="button" class="day ${d.getDay() % 6 ? '' : 'weekend'}" role="tab" data-k="${k}" aria-selected="${k === S.day}">
        <small>${d.toLocaleDateString('id-ID', { weekday: 'short' }).replace('.', '')}</small><b>${d.getDate()}</b><span class="dot ${has ? '' : 'off'}"></span></button>`;
    }).join('');
    $$('.day').forEach(b => b.addEventListener('click', () => { S.day = b.dataset.k; buzz(5); renderJadwal(); }));
    const list = S.interviews.filter(i => i.date === S.day).sort((a, b) => a.time.localeCompare(b.time));
    $('dayList').innerHTML = `
      <div class="section-title"><h3>${esc(dayLabel(S.day))}</h3><span class="label">${list.length} wawancara</span></div>
      ${list.length
        ? `<ul class="list stagger" style="margin-top:10px">${list.map((iv, i) => ivRow(iv).replace('<li class="iv"', `<li class="iv" style="--i:${i}"`)).join('')}</ul>`
        : `<div class="empty"><svg viewBox="0 0 56 56"><rect x="8" y="10" width="40" height="38" rx="6"/><path d="M8 22h40"/></svg><span>Tidak ada wawancara di hari ini.</span><button type="button" class="btn accent" id="emptySched" style="width:auto">Jadwalkan wawancara</button></div>`}`;
    bindIvRows($('dayList'));
    const es = $('emptySched'); if (es) es.addEventListener('click', () => openSchedule(null, S.day));
  }
  $('fab').addEventListener('click', () => openSchedule(null, S.day));
  function rerender() { if (cur) renderRoute(cur); }

  function openSchedule(candId, dayKey) {
    const st = { cand: candId, date: null, time: null, mode: 'Video' };
    const wd = weekdays(5);
    if (dayKey && wd.some(d => dkey(d) === dayKey)) st.date = dayKey;
    const TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const draw = () => {
      const taken = new Set(S.interviews.filter(i => i.date === st.date).map(i => i.time));
      $('sheetBody').innerHTML = `
        <span class="label">Kandidat</span>
        <div class="chips">${active().map(c => `<button type="button" class="chip" data-c="${c.id}" aria-pressed="${st.cand === c.id}">${esc(first(c))}</button>`).join('')}</div>
        <span class="label">Hari</span>
        <div class="chips">${wd.map(d => `<button type="button" class="chip" data-d="${dkey(d)}" aria-pressed="${st.date === dkey(d)}">${d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</button>`).join('')}</div>
        <span class="label">Jam (WIB)</span>
        <div class="slots">${TIMES.map(t => `<button type="button" class="slot" data-t="${t}" aria-pressed="${st.time === t}" ${!st.date || taken.has(t) ? 'disabled' : ''}>${t}</button>`).join('')}</div>
        <div class="seg" data-mode="${st.mode === 'Video' ? 'cv' : 'es'}" style="--x:0" id="modePick">
          <span class="seg-thumb" style="background:var(--accent)"></span>
          <button type="button" data-m="Video" aria-pressed="${st.mode === 'Video'}">Video</button>
          <button type="button" data-m="Tatap muka" aria-pressed="${st.mode === 'Tatap muka'}">Tatap muka</button>
        </div>
        <button type="button" class="btn accent" id="confirmIv" ${st.cand && st.date && st.time ? '' : 'disabled'}>${st.cand && st.date && st.time ? `Konfirmasi · ${st.time}` : 'Pilih kandidat, hari dan jam'}</button>`;
      $$('[data-c]', $('sheetBody')).forEach(b => b.addEventListener('click', () => { st.cand = b.dataset.c; buzz(5); draw(); }));
      $$('[data-d]', $('sheetBody')).forEach(b => b.addEventListener('click', () => { st.date = b.dataset.d; st.time = null; buzz(5); draw(); }));
      $$('[data-t]', $('sheetBody')).forEach(b => b.addEventListener('click', () => { st.time = b.dataset.t; buzz(5); draw(); }));
      $$('[data-m]', $('sheetBody')).forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.m; draw(); }));
      $('confirmIv').addEventListener('click', confirm);
    };
    const confirm = (e) => {
      const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin"></span>';
      setTimeout(() => {
        const iv = { id: 'iv' + Date.now(), cand: st.cand, date: st.date, time: st.time, mode: st.mode };
        S.interviews.push(iv); save.interviews();
        const c = byId(st.cand);
        if (STAGES.findIndex(s => s.id === S.stages[c.id]) < 2) { S.stages[c.id] = 'wawancara'; save.stages(); }
        S.day = st.date;
        $('sheetTitle').textContent = 'Terjadwal';
        $('sheetBody').innerHTML = `
          <div class="success"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg>
            <h3>Wawancara ${esc(first(c))}</h3><p class="hint">${esc(dayLabel(iv.date))} · ${iv.time} WIB · ${esc(iv.mode)}</p></div>
          <button type="button" class="btn ghost" id="addCal">Tambah ke kalender</button>
          <button type="button" class="btn" id="doneIv">Selesai</button>`;
        const r = $('sheet').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 90);
        buzz([10, 40, 10, 40, 20]);
        notify('Wawancara terjadwal', `${c.name}, ${dayLabel(iv.date)} pukul ${iv.time}.`);
        $('addCal').addEventListener('click', () => downloadIcs(iv));
        $('doneIv').addEventListener('click', () => { closeSheet(); rerender(); });
      }, 650);
    };
    openSheet('Jadwalkan wawancara', '');
    draw();
  }
  function downloadIcs(iv) {
    if (!iv) return;
    const c = byId(iv.cand);
    const [h, m] = iv.time.split(':');
    const dt = iv.date.replace(/-/g, '') + 'T' + h + m + '00';
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jejak//Demo//ID', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${iv.id}@jejak-apps`, `DTSTAMP:${now}`, `DTSTART:${dt}`, 'DURATION:PT45M',
      `SUMMARY:Wawancara ${c.name} (${ROLE})`, `DESCRIPTION:${iv.mode}. Dossier dan bukti ada di aplikasi Jejak.`,
      'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Wawancara 15 menit lagi', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    saveFile(new Blob([ics], { type: 'text/calendar' }), `wawancara-${c.id}-${iv.date}.ics`);
    toast('File kalender dibuat');
  }
  function saveFile(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* =====================================================================
     Akun + Izin
     ===================================================================== */
  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  async function renderAkun() {
    const el = document.querySelector('[data-screen="akun"]');
    const theme = store.get('theme', 'system');
    const bioOn = !!store.get('bioCred', null);
    const notifOn = 'Notification' in window && Notification.permission === 'granted' && store.get('notif', false);
    el.innerHTML = `
      <div class="card profile">${'<span class="av lg" style="--h:222">PD</span>'}<div><b>Perekrut demo</b><small>Pengguna 1234 · ${esc(ROLE)}</small></div></div>
      <div class="section-title"><span class="label">Keamanan</span></div>
      <ul class="list">
        <li class="set"><span class="ic">${icon('<path d="M12 3a8 8 0 0 0-8 8v2M20 13v-2a8 8 0 0 0-3-6.2M8 21c1-2 1.5-4 1.5-7a2.5 2.5 0 0 1 5 0c0 2-.2 3.8-.8 5.5"/>')}</span>
          <span><b>Masuk dengan biometrik</b><small id="bioNote">Face ID atau sidik jari di perangkat ini</small></span>
          <button type="button" class="switch" role="switch" id="bioSw" aria-checked="${bioOn}" aria-label="Masuk dengan biometrik"></button></li>
        <li class="set"><span class="ic g">${icon('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>')}</span>
          <span><b>Notifikasi</b><small>Uji kerja selesai, wawancara, temuan agen</small></span>
          <button type="button" class="switch" role="switch" id="notifSw" aria-checked="${notifOn}" aria-label="Notifikasi"></button></li>
      </ul>
      <div class="section-title"><span class="label">Tampilan</span></div>
      <div class="list" style="padding-top:12px">
        <div class="theme-seg">${[['system', 'Sistem'], ['light', 'Terang'], ['dark', 'Gelap']].map(([k, n]) => `<button type="button" class="chip" data-theme-pick="${k}" aria-pressed="${theme === k}">${n}</button>`).join('')}</div>
      </div>
      <div class="section-title"><span class="label">Data & privasi</span></div>
      <ul class="list">
        <li><button type="button" class="set" data-go="akun/izin"><span class="ic r">${icon('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>')}</span>
          <span><b>Mode kandidat</b><small>Izin per sumber, sanggahan, jejak audit</small></span><span class="chev">›</span></button></li>
        <li><button type="button" class="set" id="exportBtn"><span class="ic">${icon('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')}</span>
          <span><b>Unduh data saya</b><small>Hak akses data (UU PDP, PDPA)</small></span><span class="chev">›</span></button></li>
        <li><button type="button" class="set" id="wipeBtn"><span class="ic x">${icon('<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>')}</span>
          <span><b>Hapus data di perangkat ini</b><small>Hak penghapusan</small></span><span class="chev">›</span></button></li>
      </ul>
      <div class="card comply">
        <span class="label">Kepatuhan</span>
        <p><b>Indonesia:</b> UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>
        <p><b>Singapura:</b> Personal Data Protection Act 2012 (PDPA) dan Tripartite Guidelines on Fair Employment Practices: penilaian berdasarkan kemampuan, bukan usia, ras, agama atau jenis kelamin.</p>
        <p>Keputusan akhir selalu oleh manusia. AI Jejak hanya membaca sumber yang diizinkan kandidat.</p>
      </div>
      <button type="button" class="btn ghost" id="logoutBtn">Keluar</button>
      <p class="hint center">Jejak demo · semua kandidat dan angka adalah contoh</p>`;
    $$('[data-go]', el).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    $$('[data-theme-pick]', el).forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themePick)));
    $('logoutBtn').addEventListener('click', logout);
    $('exportBtn').addEventListener('click', exportData);
    $('wipeBtn').addEventListener('click', confirmWipe);
    const bioSw = $('bioSw');
    if (!(await bioAvailable())) { bioSw.disabled = true; $('bioNote').textContent = 'Tidak tersedia di perangkat atau browser ini'; }
    bioSw.addEventListener('click', async () => {
      if (store.get('bioCred', null)) { store.del('bioCred'); bioSw.setAttribute('aria-checked', 'false'); toast('Masuk biometrik dimatikan'); return; }
      try { await bioEnable(); bioSw.setAttribute('aria-checked', 'true'); buzz([8, 30, 8]); toast('Masuk biometrik aktif'); }
      catch (e) { toast('Biometrik tidak diaktifkan'); }
    });
    $('notifSw').addEventListener('click', async () => {
      const sw = $('notifSw');
      if (sw.getAttribute('aria-checked') === 'true') { store.set('notif', false); sw.setAttribute('aria-checked', 'false'); return; }
      if (!('Notification' in window)) return toast('Browser ini tidak mendukung notifikasi');
      const p = await Notification.requestPermission();
      if (p === 'granted') { store.set('notif', true); sw.setAttribute('aria-checked', 'true'); notify('Notifikasi aktif', 'AI Jejak akan memberi tahu saat ada bukti baru.'); }
      else toast('Izin notifikasi ditolak di pengaturan browser');
    });
  }
  function setTheme(t) {
    store.set('theme', t);
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    syncThemeColor();
    buzz(5);
    rerender();
  }
  function syncThemeColor() {
    $('themeColor').setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  }
  function exportData() {
    const keys = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('jejak.')) keys.push(k); } } catch (e) {}
    const data = { dibuat: new Date().toISOString(), catatan: 'Data demo Jejak yang tersimpan di perangkat ini.', data: Object.fromEntries(keys.map(k => [k.slice(6), store.get(k.slice(6), null)])) };
    delete data.data.bioCred;
    saveFile(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'jejak-data-saya.json');
    toast('Data diunduh');
  }
  function confirmWipe() {
    openSheet('Hapus data di perangkat ini?', `
      <p class="hint">Shortlist, jadwal, izin, sanggahan dan login biometrik di perangkat ini akan dihapus. Kamu akan keluar.</p>
      <button type="button" class="btn danger" id="doWipe">Hapus dan keluar</button>
      <button type="button" class="btn ghost" id="noWipe">Batal</button>`);
    $('noWipe').addEventListener('click', closeSheet);
    $('doWipe').addEventListener('click', () => {
      try { Object.keys(localStorage).filter(k => k.startsWith('jejak.')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
      location.reload();
    });
  }
  function logout() {
    store.del('session'); closeSheet();
    $('shell').hidden = true; booted = false;
    showLogin();
  }

  function log(m) {
    const d = new Date();
    S.audit.unshift({ t: `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`, m });
    S.audit.length = Math.min(S.audit.length, 20);
    store.set('audit', S.audit);
  }
  function renderIzin() {
    const page = document.querySelector('[data-page="izin"]');
    page.hidden = false;
    $('smallTitle').textContent = 'Mode kandidat';
    const c = byId(S.izinCand);
    const used = [...new Set(c.ev.map(e => e.s).concat(['G']))];
    const es = evScore(c), base = baseEvScore(c);
    const challengeable = SKILLS.filter(s => ['over', 'none', 'partial'].includes(status(c.claim[s.id], evLevel(c, s.id))[0]));
    page.innerHTML = `
      <div class="chips">${CANDS.map(x => `<button type="button" class="chip" data-c="${x.id}" aria-pressed="${x.id === c.id}">${esc(first(x))}</button>`).join('')}</div>
      <p class="hint">Ini tampilan yang dilihat <b>${esc(c.name)}</b> di ponselnya. Matikan sumber, dan AI Jejak langsung menghitung ulang tanpa sumber itu.</p>
      <div class="card consent-score">
        <span class="label">Skor bukti saat ini</span><span class="was">${es !== base ? `dengan semua sumber: ${base}` : 'semua sumber aktif'}</span>
        <b data-count="${es}">0</b><span></span>
      </div>
      <div class="section-title"><span class="label">Sumber yang boleh dibaca AI Jejak</span></div>
      <ul class="list">${Object.entries(SRC).map(([k, v]) => {
        const has = used.includes(k), on = has && enabled(c, k);
        return `<li class="src-row"><span class="t">${esc(v.name)} <span class="tr">· bobot ${v.trust.toFixed(1)}</span></span>
          <button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="Izinkan ${esc(v.name)}" data-s="${k}" ${has ? '' : 'disabled'}></button>
          <p>${has ? esc(v.reads) : 'Belum ada data dari sumber ini.'}</p></li>`;
      }).join('')}</ul>
      <div class="section-title"><span class="label">Sanggah status</span></div>
      ${challengeable.length
        ? `<ul class="list">${challengeable.map(s => {
            const [st, lbl] = status(c.claim[s.id], evLevel(c, s.id));
            return `<li><button type="button" class="row" data-ch="${s.id}"><span class="t">${esc(s.name)}</span><span class="pill st-${st}">${lbl}</span></button></li>`;
          }).join('')}</ul>`
        : '<p class="hint">Semua keahlian sudah terverifikasi.</p>'}
      <div class="section-title"><span class="label">Jejak audit</span></div>
      <ul class="list audit">${S.audit.map(a => `<li><time>${esc(a.t)}</time><span>${esc(a.m)}</span></li>`).join('')}</ul>`;
    const scoreEl = page.querySelector('[data-count]');
    scoreEl.dataset.v = page.dataset.last || 0;
    countUp(scoreEl, es);
    page.dataset.last = es;
    $$('[data-c]', page).forEach(b => b.addEventListener('click', () => { S.izinCand = b.dataset.c; page.dataset.last = 0; renderIzin(); }));
    $$('.switch', page).forEach(sw => sw.addEventListener('click', () => {
      const k = sw.dataset.s, list = S.off[c.id] || (S.off[c.id] = []);
      const nowOn = list.includes(k);
      if (nowOn) list.splice(list.indexOf(k), 1); else list.push(k);
      store.set('consentOff', S.off);
      log(`${first(c)} ${nowOn ? 'mengizinkan' : 'mencabut izin'} ${SRC[k].name.toLowerCase()}.`);
      buzz(8);
      renderIzin();
      toast(nowOn ? `${SRC[k].name} diizinkan` : `Izin ${SRC[k].name.toLowerCase()} dicabut`);
    }));
    $$('[data-ch]', page).forEach(el => el.addEventListener('click', () => openChallenge(c, el.dataset.ch)));
  }
  function openChallenge(c, k) {
    const s = SKILLS.find(x => x.id === k);
    openSheet('Sanggah: ' + s.name, `
      <p class="hint">Jelaskan kenapa status ini keliru dan sertakan bukti baru. Perekrut tidak memutuskan sebelum sanggahan ditinjau.</p>
      <label class="f" for="chText">Alasan dan bukti<textarea id="chText" placeholder="Contoh: saya menangani lock stok di proyek X, kodenya di …"></textarea></label>
      <button type="button" class="btn accent" id="chSend" disabled>Kirim sanggahan</button>`);
    const t = $('chText'), b = $('chSend');
    t.addEventListener('input', () => { b.disabled = t.value.trim().length < 10; });
    b.addEventListener('click', () => {
      b.disabled = true;
      log(`${first(c)} menyanggah status ${s.name}.`);
      closeSheet(); renderIzin(); buzz([8, 30, 8]);
      toast('Sanggahan tersimpan di perangkat ini (demo)');
    });
  }

  /* =====================================================================
     Notifications
     ===================================================================== */
  function updateBadge(ring) {
    const n = NOTIFS.filter(x => !S.notifRead.has(x.id)).length;
    const b = $('bellBadge');
    b.hidden = !n; b.textContent = n;
    if (ring && n) { const bell = $('bellBtn'); bell.classList.remove('bell-ring'); void bell.offsetWidth; bell.classList.add('bell-ring'); }
  }
  $('bellBtn').addEventListener('click', () => {
    openSheet('Notifikasi', `<ul class="list stagger">${NOTIFS.map((n, i) => `<li style="--i:${i}"><button type="button" class="row" data-go="${n.go}">
      <span class="t" style="font-weight:${S.notifRead.has(n.id) ? 400 : 600}">${esc(n.m)}</span><span class="chev">›</span>
      <span class="lv">${esc(n.t)}</span></button></li>`).join('')}</ul>`);
    $$('[data-go]', $('sheetBody')).forEach(b => b.addEventListener('click', () => { closeSheet(); go(b.dataset.go); }));
    NOTIFS.forEach(n => S.notifRead.add(n.id));
    store.set('notifRead', [...S.notifRead]);
    updateBadge();
  });
  async function notify(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !store.get('notif', false)) return;
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
      else new Notification(title, { body, icon: 'icons/icon-192.png' });
    } catch (e) {}
  }

  /* =====================================================================
     Sheet (drag to dismiss) + toast
     ===================================================================== */
  let lastFocus = null;
  function openSheet(title, html) {
    lastFocus = document.activeElement;
    $('sheetTitle').textContent = title;
    $('sheetBody').innerHTML = html;
    $('sheet').classList.remove('closing'); $('sheetBackdrop').classList.remove('closing');
    $('sheet').style.transform = '';
    $('sheetBackdrop').hidden = false; $('sheet').hidden = false;
    $('sheet').scrollTop = 0;
    $('sheetClose').focus({ preventScroll: true });
    buzz(5);
  }
  function closeSheet() {
    if ($('sheet').hidden) return;
    const fin = () => {
      $('sheet').hidden = true; $('sheetBackdrop').hidden = true;
      $('sheet').classList.remove('closing'); $('sheetBackdrop').classList.remove('closing');
      $('sheet').style.transform = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    if (reduceMotion()) return fin();
    $('sheet').classList.add('closing'); $('sheetBackdrop').classList.add('closing');
    setTimeout(fin, 240);
  }
  $('sheetClose').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  (() => {
    const zone = $('grabZone'), sheet = $('sheet');
    let y0 = null, dy = 0;
    zone.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; y0 = e.clientY; dy = 0; zone.setPointerCapture(e.pointerId); });
    zone.addEventListener('pointermove', (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
      $('sheetBackdrop').style.opacity = String(Math.max(0, 1 - dy / 400));
    });
    const end = () => {
      if (y0 === null) return;
      y0 = null;
      $('sheetBackdrop').style.opacity = '';
      if (dy > 110) { sheet.style.transform = ''; closeSheet(); }
      else { sheet.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.9,.25,1.2)' }); sheet.style.transform = ''; }
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  })();

  let toastTimer, toastFn = null;
  function toast(m, act, fn) {
    const t = $('toast');
    $('toastMsg').textContent = m;
    const a = $('toastAct');
    a.hidden = !act; a.textContent = act || '';
    toastFn = fn || null;
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    t.style.bottom = $('tabbar').classList.contains('away') ? 'calc(env(safe-area-inset-bottom, 0px) + 92px)' : '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; toastFn = null; }, act ? 4500 : 2400);
  }
  $('toastAct').addEventListener('click', () => { const fn = toastFn; $('toast').hidden = true; toastFn = null; if (fn) { buzz(8); fn(); } });

  /* =====================================================================
     Install + service worker
     ===================================================================== */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; $('installBtn').hidden = false; });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) {}
    deferredPrompt = null; $('installBtn').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; toast('Jejak terpasang'); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

  /* =====================================================================
     Boot
     ===================================================================== */
  store.del('preferWeb');
  let booted = false;
  function boot() {
    if (!booted) {
      booted = true;
      cur = null;
      if (!window.__jejakRoute) { window.__jejakRoute = true; window.addEventListener('hashchange', onRoute); }
    }
    onRoute();
    syncThemeColor();
    setTimeout(() => updateBadge(true), 900);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone && !store.get('iosHint', false)) {
      setTimeout(() => toast('Pasang: ketuk Bagikan, lalu Tambah ke Layar Utama', 'Oke', () => store.set('iosHint', true)), 2500);
    }
  }
  window.addEventListener('scroll', () => $('appbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
  window.addEventListener('resize', moveTabInd);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', () => { syncThemeColor(); if (booted && cur && cur.sub && cur.tab === 'kandidat') rerender(); });

  splash().then(() => { if (store.get('session', null)) { $('shell').hidden = false; boot(); } else showLogin(); });
})();
