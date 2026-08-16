// QUANTAI — scene scrubbing + LP register form.
// Scroll is travel: each scene arrives by coherence (blur resolves to
// sharpness) and dissolves as the visitor moves on.

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = Array.from(document.querySelectorAll('.scene')).map((el) => ({
    el,
    a: parseFloat(el.dataset.in),
    b: parseFloat(el.dataset.out),
  }));

  const EDGE = 0.03;

  function smooth(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function scrub() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    for (const s of scenes) {
      const tin = smooth(s.a, s.a + EDGE, p);
      const tout = smooth(s.b - EDGE, s.b, p);
      const o = tin * (1 - tout);
      const el = s.el;
      if (o < 0.012) {
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        continue;
      }
      el.style.visibility = 'visible';
      el.style.opacity = o.toFixed(3);
      const blur = ((1 - tin) * 14 + tout * 14).toFixed(1);
      const rise = ((1 - tin) * 34 - tout * 34).toFixed(1);
      el.style.filter = blur > 0.2 ? `blur(${blur}px)` : 'none';
      el.style.transform = `translateY(${rise}px)`;
      el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    }
    requestAnimationFrame(scrub);
  }

  if (!document.body.classList.contains('static') && !reduceMotion) {
    requestAnimationFrame(scrub);
  }

  // ------------------------------------------------------------ film
  // reveal the science film only if footage has been dropped in
  const film = document.querySelector('.scene-film');
  if (film) {
    film.addEventListener('loadeddata', () => {
      film.style.display = 'block';
      film.play().catch(() => {});
    });
    film.load();
  }

  // ------------------------------------------------------------ form
  const form = document.getElementById('lp-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('.submit');
  const cfg = window.QUANTAI_CONFIG || {};

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    if (form.company && form.company.value) {
      status.textContent = 'Received. In time.';
      status.classList.add('ok');
      form.reset();
      return;
    }

    const full_name = form.full_name.value.trim();
    const email = form.email.value.trim();

    if (!full_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'A name and a working email, please.';
      status.classList.add('err');
      return;
    }

    button.disabled = true;
    try {
      const res = await fetch(cfg.supabaseUrl + '/rest/v1/lp_interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.supabaseKey,
          Authorization: 'Bearer ' + cfg.supabaseKey,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ full_name, email, source: 'quantai-site' }),
      });
      if (!res.ok) throw new Error('status ' + res.status);
      status.textContent = 'Received. We will find you at the right time.';
      status.classList.add('ok');
      form.reset();
    } catch (err) {
      status.textContent = 'Something slipped in time — please try again.';
      status.classList.add('err');
    }
    button.disabled = false;
  });
})();
