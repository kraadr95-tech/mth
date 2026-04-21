/* ================================================
   MOTOHUB POLSKA  ·  script.js
   ================================================ */

/* ── PARTICLES ──────────────────────────────────── */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [];

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };

  const mk = () => ({
    x:  Math.random() * W,
    y:  Math.random() * H,
    vx: (Math.random() - .5) * .4,
    vy: (Math.random() - .5) * .4 - .1,
    r:  Math.random() * 1.4 + .4,
    a:  Math.random() * .55 + .1,
    green: Math.random() > .65,
  });

  const init = () => {
    resize();
    const n = Math.min(160, Math.floor(W * H / 7500));
    pts = Array.from({ length: n }, mk);
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);

    // lines
    const thresh = 140;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < thresh * thresh) {
          const a = (1 - Math.sqrt(d2) / thresh) * .14;
          ctx.strokeStyle = pts[i].green
            ? `rgba(57,255,20,${a})`
            : `rgba(100,120,160,${a * .6})`;
          ctx.lineWidth = .6;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }

    // dots
    for (const p of pts) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.green
        ? `rgba(57,255,20,${p.a})`
        : `rgba(120,140,180,${p.a * .55})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', init, { passive: true });
  init();
  draw();
})();


/* ── NAVBAR SCROLL STATE ─────────────────────────── */
(function () {
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ── SCROLL REVEAL ───────────────────────────────── */
(function () {
  const els = document.querySelectorAll('.reveal, .reveal-tile');

  const show = (el) => {
    const delay = parseInt(el.dataset.delay || 0, 10);
    setTimeout(() => el.classList.add('visible'), delay);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px -50px 0px' });

    els.forEach(el => io.observe(el));
  } else {
    els.forEach(show);
  }
})();


/* ── LIVE DISCORD STATS ──────────────────────────── */
(function () {
  const INVITE = 'motohub-polska-spolecznosc-motocyklowa-1191618604026826844';
  const API    = `https://discord.com/api/v9/invites/${INVITE}?with_counts=true`;

  const elMembers = document.getElementById('stat-members');
  const elOnline  = document.getElementById('stat-online');

  function animateCount(el, from, to, duration) {
    // cancel any running animation on this element
    if (el._animFrame) cancelAnimationFrame(el._animFrame);
    const start = performance.now();
    const tick  = (now) => {
      const p    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      const val  = Math.round(from + (to - from) * ease);
      el.textContent = val.toLocaleString('pl-PL');
      if (p < 1) el._animFrame = requestAnimationFrame(tick);
    };
    el._animFrame = requestAnimationFrame(tick);
  }

  function currentVal(el, fallback) {
    const n = parseInt((el.textContent || '').replace(/\s|\u00a0/g, '').replace(',', ''));
    return isNaN(n) ? fallback : n;
  }

  async function fetchStats() {
    try {
      const res  = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const members = data.approximate_member_count;
      const online  = data.approximate_presence_count;

      if (elMembers && members) {
        animateCount(elMembers, currentVal(elMembers, members), members, 1800);
      }
      if (elOnline && online) {
        animateCount(elOnline, currentVal(elOnline, 0), online, 1800);
      }
    } catch (err) {
      console.warn('Discord API niedostępne:', err.message);
      // Pokaż chociaż wartość domyślną z animacją
      if (elMembers && currentVal(elMembers, 0) === 0) {
        animateCount(elMembers, 0, 1482, 1800);
      }
    }
  }

  // Uruchom od razu
  fetchStats();
  // Odświeżaj co 5 minut
  setInterval(fetchStats, 5 * 60 * 1000);
})();



/* ── KALENDARZ ZLOTÓW — RSS ──────────────────────── */
(function () {
  const RSS     = 'https://gdzienazlot.pl/feed/';
  const PROXY   = 'https://api.allorigins.win/get?url=' + encodeURIComponent(RSS);
  const container = document.getElementById('cal-events');
  const card      = document.getElementById('feature-calendar');
  const overlay   = document.getElementById('cal-overlay');
  if (!container || !card || !overlay) return;

  let loaded = false;
  let autoOpened = false;

  /* ── helpers ── */
  function formatDate(str) {
    try {
      return new Date(str).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  }

  function extractRegion(title) {
    const m = (title || '').match(/^([^–\-]+?)[\s]*[-–]/);
    return m ? m[1].trim() : '';
  }

  function getImg(item) {
    // 1. enclosure
    const enc = item.querySelector('enclosure');
    if (enc?.getAttribute('url')) return enc.getAttribute('url');
    // 2. media:content
    const mc = item.querySelector('content');
    if (mc?.getAttribute('url')) return mc.getAttribute('url');
    // 3. first <img> in description
    const desc = item.querySelector('description')?.textContent || '';
    const m = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    return '';
  }

  /* ── render ── */
  function renderEvents(items) {
    container.innerHTML = '';

    items.forEach(item => {
      const title  = item.querySelector('title')?.textContent?.trim() || '';
      const link   = item.querySelector('link')?.textContent?.trim() || '#';
      const pubDate= item.querySelector('pubDate')?.textContent || '';
      const region = extractRegion(title);
      const imgSrc = getImg(item);
      const cleanTitle = region
        ? title.replace(/^[^–\-]+[-–]\s*/, '').trim()
        : title;

      const el = document.createElement('div');
      el.className = 'cal-event';
      el.innerHTML = `
        ${imgSrc
          ? `<img class="cal-event__img" src="${imgSrc}" alt="" loading="lazy"
               onerror="this.outerHTML='<div class=cal-event__img-placeholder>🏍️</div>'">`
          : `<div class="cal-event__img-placeholder">🏍️</div>`}
        <div class="cal-event__body">
          ${region ? `<span class="cal-event__region">${region}</span>` : ''}
          <div class="cal-event__title">${cleanTitle}</div>
          <div class="cal-event__meta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${formatDate(pubDate)}
          </div>
        </div>`;

      container.appendChild(el);
    });
  }

  /* ── fetch ── */
  async function loadRSS() {
    if (loaded) return;
    loaded = true;
    try {
      const res  = await fetch(PROXY, { cache: 'no-store' });
      const json = await res.json();
      if (!json.contents) throw new Error('empty');

      const xml   = new DOMParser().parseFromString(json.contents, 'text/xml');
      const items = Array.from(xml.querySelectorAll('item')).slice(0, 2);
      if (!items.length) throw new Error('no items');

      renderEvents(items);
    } catch (e) {
      container.innerHTML =
        '<p style="color:var(--muted);font-size:.82rem;padding:8px 0;text-align:center">⚠️ Nie udało się załadować wydarzeń</p>';
    }
  }

  /* ── auto-open on scroll into view ── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || autoOpened) return;
      autoOpened = true;
      io.unobserve(card);

      // preload RSS data
      loadRSS();

      // shake hint after short delay
      setTimeout(() => {
        card.classList.add('cal-shake');
        card.addEventListener('animationend', () => card.classList.remove('cal-shake'), { once: true });
      }, 400);

      // auto-open overlay briefly as a peek
      setTimeout(() => {
        card.classList.add('cal-peek');
        setTimeout(() => card.classList.remove('cal-peek'), 2200);
      }, 700);
    });
  }, { threshold: 0.5 });

  io.observe(card);

  // preload early anyway
  setTimeout(loadRSS, 2000);
})();



(function () {
  const nums = document.querySelectorAll('.stat__num[data-target]');
  const run = (el, target) => {
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / 1600, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 4)) * target);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { run(e.target, parseInt(e.target.dataset.target)); io.unobserve(e.target); }
    });
  }, { threshold: .6 });
  nums.forEach(el => io.observe(el));
})();


(function () {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.tile').forEach(tile => {
    let raf;

    tile.addEventListener('mousemove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r  = tile.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
        const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
        tile.style.transform =
          `translateY(-10px) scale(1.02) perspective(700px) ` +
          `rotateX(${dy * -5}deg) rotateY(${dx * 7}deg)`;
      });
    });

    tile.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      tile.style.transition = 'transform .6s cubic-bezier(0.22,1,0.36,1), border-color .4s, box-shadow .4s';
      tile.style.transform = '';
      setTimeout(() => tile.style.transition = '', 600);
    });
  });
})();


/* ── CURSOR AMBIENT GLOW ─────────────────────────── */
(function () {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const el = Object.assign(document.createElement('div'), {});
  Object.assign(el.style, {
    position: 'fixed', width: '500px', height: '500px',
    borderRadius: '50%', pointerEvents: 'none', zIndex: '0',
    background: 'radial-gradient(circle, rgba(57,255,20,.045) 0%, transparent 70%)',
    transform: 'translate(-50%,-50%)',
    transition: 'left .15s ease-out, top .15s ease-out',
  });
  document.body.appendChild(el);

  window.addEventListener('mousemove', e => {
    el.style.left = e.clientX + 'px';
    el.style.top  = e.clientY + 'px';
  }, { passive: true });
})();


/* ── SMOOTH ANCHOR SCROLL ────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
