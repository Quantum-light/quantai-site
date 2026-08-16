// QUANTAI — panel reveals + LP register-interest form.

(function () {
  // ---------------------------------------------------------- reveals
  const panels = document.querySelectorAll('.panel');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.18 }
  );
  panels.forEach((p) => io.observe(p));

  // ---------------------------------------------------------- LP form
  const form = document.getElementById('lp-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('.submit');
  const cfg = window.QUANTAI_CONFIG || {};

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    // honeypot — silently accept
    if (form.company && form.company.value) {
      status.textContent = 'Received. In time.';
      status.classList.add('ok');
      form.reset();
      return;
    }

    const full_name = form.full_name.value.trim();
    const email = form.email.value.trim();
    const note = form.note.value.trim();

    if (!full_name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
        body: JSON.stringify({ full_name, email, note: note || null, source: 'quantai-site' }),
      });
      if (!res.ok) throw new Error('status ' + res.status);
      status.textContent = 'Received. We will find you at the right time.';
      status.classList.add('ok');
      form.reset();
    } catch (err) {
      status.textContent = 'Something slipped in time — please try again.';
      status.classList.add('err');
      button.disabled = false;
      return;
    }
    button.disabled = false;
  });
})();
