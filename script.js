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
    const start = performance.now();
    const tick  = (now) => {
      const p    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(from + (to - from) * ease).toLocaleString('pl-PL');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function fetchStats() {
    try {
      const res  = await fetch(API);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();

      const members = data.approximate_member_count;
      const online  = data.approximate_presence_count;

      if (elMembers && members) {
        const prev = parseInt(elMembers.textContent.replace(/\s/g, '')) || 1482;
        animateCount(elMembers, prev, members, 1800);
      }

      if (elOnline && online) {
        const prev = parseInt(elOnline.textContent) || 0;
        animateCount(elOnline, prev, online, 1800);
      }
    } catch (err) {
      // API niedostępne — zostają wartości domyślne
      console.warn('Discord API error:', err);
      if (elMembers && elMembers.textContent === '1482') {
        animateCount(elMembers, 0, 1482, 1800);
      }
    }
  }

  // Pobierz od razu po załadowaniu
  fetchStats();

  // Odświeżaj co 5 minut
  setInterval(fetchStats, 5 * 60 * 1000);
})();





/* ── STATIC COUNTER (kanały) ─────────────────────── */
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
