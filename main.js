document.documentElement.classList.add('js');

/* ── Homepage Email Signup (Optimized UI Speed) ── */
const signupForm = document.getElementById('homepage-signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    const btn = document.getElementById('signup-submit-btn');
    const input = document.querySelector('.mac-input');
    const emailValue = input.value;

    // 1. Change button to "Joining..." and turn it dull grey
    btn.textContent = 'Joining...';
    btn.style.background = '#a1a1a6'; 
    btn.style.pointerEvents = 'none'; 
    
    const formData = new FormData();
    formData.append('email', emailValue);

    // Replace with your Google Apps Script Web App URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxAZplNmT44OTnC3tLYuZHZUNYBGUnjQSCaa5b17iMoPzD8Y5nE8vQw2Svgb05om-CeUw/exec';

    // 2. Fire the request in the background (no-cors mode skips slow preflight checks)
    fetch(scriptURL, { method: 'POST', body: formData, mode: 'no-cors' })
      .catch(error => console.error('Error in background fetch:', error.message));

    // 3. Force the UI to show success after exactly 1.2 seconds
    setTimeout(() => {
      btn.textContent = 'Success! Welcome to the club.';
      btn.style.background = '#28c840'; 
      input.value = '';
      
      // 4. Inject the check inbox note
      let inboxNote = document.getElementById('check-mail-note');
      if (!inboxNote) {
        inboxNote = document.createElement('p');
        inboxNote.id = 'check-mail-note';
        inboxNote.style.fontSize = '12px';
        inboxNote.style.color = 'var(--muted)';
        inboxNote.style.margin = '4px 0 0 0';
        inboxNote.style.textAlign = 'center';
        inboxNote.style.animation = 'pop-letter 0.5s ease forwards';
        signupForm.appendChild(inboxNote);
      }
      inboxNote.textContent = 'Check your mail inbox for the link!';

      // 5. Reset button after 5 seconds
      setTimeout(() => {
        btn.textContent = 'Get Access';
        btn.style.background = '#007aff';
        btn.style.pointerEvents = 'auto';
      }, 5000);
      
    }, 1200); // 1.2 second wait time for the perfect visual delay
  });
}
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