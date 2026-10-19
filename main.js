document.documentElement.classList.add('js');

/* ── Scroll reveal (staggered) ── */
(() => {
  const els = document.querySelectorAll('.reveal, .reveal-scale');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    let i = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.transitionDelay = `${i++ * 80}ms`;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));

  // Drop the stagger delay once revealed so hover effects respond instantly.
  document.addEventListener('transitionend', (e) => {
    if (e.target.classList?.contains('is-in')) e.target.style.transitionDelay = '';
  });
})();

/* ── Hero title: split into letters, stagger in, dock-style lift + pop on hover ── */
(() => {
  const title = document.getElementById('hero-title');
  if (!title) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());

  const letters = [];
  const split = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const word = document.createElement('span');
        word.className = 'word';
        word.setAttribute('aria-hidden', 'true');
        [...part].forEach((c) => {
          const ch = document.createElement('span');
          ch.className = 'ch';
          ch.textContent = c;
          word.appendChild(ch);
          letters.push(ch);
        });
        frag.appendChild(word);
      });
      child.replaceWith(frag);
    });
  };
  split(title);

  if (!reduced) {
    letters.forEach((ch) => ch.classList.add('is-hidden'));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      letters.forEach((ch, i) => {
        ch.classList.add('is-entering');
        ch.style.transitionDelay = `${i * 22}ms`;
        ch.classList.remove('is-hidden');
      });
      setTimeout(() => letters.forEach((ch) => {
        ch.classList.remove('is-entering');
        ch.style.transitionDelay = '';
      }), letters.length * 22 + 1000);
    }));
  }

  if (reduced || !matchMedia('(hover: hover)').matches) return;

  // Letters near the cursor rise and swell, like the macOS dock.
  title.addEventListener('pointermove', (e) => {
    letters.forEach((ch) => {
      const r = ch.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy * 1.6);
      const f = Math.max(0, 1 - d / 140);
      ch.style.setProperty('--lift', `${(-f * f * 10).toFixed(2)}px`);
      ch.style.setProperty('--grow', (1 + f * f * 0.12).toFixed(3));
    });
  });
  title.addEventListener('pointerleave', () => {
    letters.forEach((ch) => { ch.style.removeProperty('--lift'); ch.style.removeProperty('--grow'); });
  });
  // Each letter gives a little springy "click" as the cursor crosses it.
  letters.forEach((ch) => {
    ch.addEventListener('pointerenter', () => {
      ch.classList.remove('is-pop');
      void ch.offsetWidth;
      ch.classList.add('is-pop');
    });
    ch.addEventListener('animationend', () => ch.classList.remove('is-pop'));
  });
})();

/* ── Tilt cards toward the cursor ── */
document.querySelectorAll('.tilt').forEach((card) => {
  if (!matchMedia('(hover: hover)').matches) return;
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const max = Number(card.dataset.tilt || 8);
    card.style.setProperty('--ry', `${x * max}deg`);
    card.style.setProperty('--rx', `${-y * max}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
  });
});

/* ── Subscribe ── */
async function subscribe(form) {
  const data = new FormData(form);
  // Add a hidden source tag so your sheet knows which form they used
  data.append('source', form.getAttribute('name'));

  // PASTE YOUR GOOGLE SCRIPT URL HERE
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG-nGPk7pEl1GdRwrhx3872bdazSmIXBjkYAdbRYhfVb74--fT9WGjLlARemiccUGJ/exec';

  // Send the data directly to Google Sheets
  const res = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: data
  });
  
  if (!res.ok) throw new Error(`Subscribe failed`);
}

document.querySelectorAll('form.signup').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.company?.value) return; // honeypot

    const btn = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const isModal = form.classList.contains('signup--modal');
    btn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Joining…';

    try {
      await subscribe(form);
      if (isModal) {
        showModalStep('done');
      } else {
        status.classList.add('is-ok');
        status.textContent = "You're in. See you Sunday.";
        form.reset();
      }
    } catch (err) {
      console.error(err);
      if (isModal) {
        // Never block the download on a newsletter hiccup.
        showModalStep('done');
      } else {
        status.classList.add('is-err');
        status.textContent = 'Something went wrong. Please try again.';
      }
    } finally {
      btn.disabled = false;
      if (isModal) status.textContent = '';
    }
  });
});

/* ── Framework modal ── */
const modal = document.getElementById('framework-modal');

function showModalStep(step) {
  modal.querySelectorAll('.modal__step').forEach((el) => {
    el.hidden = el.dataset.step !== step;
  });
}

document.querySelectorAll('[data-open-modal]').forEach((btn) => {
  btn.addEventListener('click', () => {
    showModalStep('form');
    modal.showModal();
    // Prefill with any email already typed on the page.
    const typed = [...document.querySelectorAll('.input')].find((i) => i.value && i.id !== 'email-modal');
    if (typed) modal.querySelector('#email-modal').value = typed.value;
  });
});
modal.querySelector('[data-close-modal]').addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close(); // click on backdrop
});