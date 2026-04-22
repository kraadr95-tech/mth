/* ================================================
   MOTOHUB POLSKA  ·  script.js (Poprawiony)
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
    const thresh = 140;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < thresh * thresh) {
          const a = (1 - Math.sqrt(d2) / thresh) * .14;
          ctx.strokeStyle = pts[i].green ? `rgba(57,255,20,${a})` : `rgba(100,120,160,${a * .6})`;
          ctx.lineWidth = .6;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.green ? `rgba(57,255,20,${p.a})` : `rgba(120,140,180,${p.a * .55})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', init, { passive: true });
  init();
  draw();
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
    }, { threshold: 0.01 });
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
    if (el._animFrame) cancelAnimationFrame(el._animFrame);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      const val = Math.round(from + (to - from) * ease);
      el.textContent = val.toLocaleString('pl-PL');
      if (p < 1) el._animFrame = requestAnimationFrame(tick);
    };
    el._animFrame = requestAnimationFrame(tick);
  }

  async function fetchStats() {
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (elMembers) animateCount(elMembers, 0, data.approximate_member_count, 1800);
      if (elOnline) animateCount(elOnline, 0, data.approximate_presence_count, 1800);
    } catch (e) { console.warn('Discord API down'); }
  }
  fetchStats();
})();

/* ── KALENDARZ ZLOTÓW (POPRAWIONY) ────────────────── */
(function () {
  const JSON_URL = 'data/events.json';
  const container = document.getElementById('cal-events');
  const card = document.getElementById('feature-calendar');
  if (!container || !card) return;

  // Funkcja formatująca datę na: 22 kwi 2026
  function formatDate(str) {
    if (!str) return '';
    try {
      const d = new Date(str);
      return d.toLocaleDateString('pl-PL', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      }).replace('.', '');
    } catch (e) { return str; }
  }

  async function loadEvents() {
    try {
      const res = await fetch(JSON_URL + '?t=' + Date.now());
      const data = await res.json();
      
      if (!data.events || data.events.length === 0) {
        container.innerHTML = '<p style="padding:20px; text-align:center; opacity:0.6; font-size:0.8rem;">Brak nadchodzących wydarzeń</p>';
        return;
      }

      // Generujemy HTML z zachowaniem Twoich stylów CSS (region, body, meta)
      container.innerHTML = data.events.map(ev => `
        <div class="cal-event">
          <div class="cal-event__body">
            ${ev.region ? `<span class="cal-event__region">${ev.region.toUpperCase()}</span>` : ''}
            <div class="cal-event__title">${ev.title}</div>
            <div class="cal-event__meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px; margin-right:5px; vertical-align:middle;">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Dodano: ${formatDate(ev.date)}
            </div>
          </div>
        </div>
      `).join('');

    } catch (e) {
      container.innerHTML = '<p style="padding:20px; text-align:center; color:var(--g); font-size:0.8rem;">Błąd ładowania danych</p>';
    }
  }

  card.addEventListener('click', (e) => {
    if (e.target.closest('.cal-events')) return;
    card.classList.toggle('cal-open');
    if (card.classList.contains('cal-open')) {
      loadEvents();
    }
  });
})();

/* ── RIDES SLIDER ────────────────────────────────── */
(function () {
  const track = document.getElementById('rides-track');
  if (!track) return;
  const slides = track.querySelectorAll('.rides-slide');
  const dotsEl = document.getElementById('rides-dots');
  let current = 0;

  slides.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'rides-dot' + (i === 0 ? ' active' : '');
    d.onclick = () => {
      current = i;
      track.style.transform = `translateX(-${current * 100}%)`;
      document.querySelectorAll('.rides-dot').forEach((dot, idx) => dot.classList.toggle('active', idx === i));
    };
    dotsEl.appendChild(d);
  });
})();

/* ── STAT NUM ANIMATION ──────────────────────────── */
(function () {
  const nums = document.querySelectorAll('.stat__num[data-target]');
  if (!nums.length) return;

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

/* ── TILE HOVER ──────────────────────────────────── */
(function () {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('mousemove', (e) => {
      const r = tile.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      tile.style.transform = `translateY(-10px) scale(1.02) perspective(700px) rotateX(${dy * -5}deg) rotateY(${dx * 7}deg)`;
    });
    tile.addEventListener('mouseleave', () => tile.style.transform = '');
  });
})();

/* ── SMOOTH SCROLL ───────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});
