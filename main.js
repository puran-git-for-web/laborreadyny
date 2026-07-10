(function () {
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function injectSharedLayout() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    if (header) {
      header.innerHTML = ''
        + '<div class="header-inner">'
        + '  <a href="index.html" class="brand">'
        + '    <img src="assets/logo.png" class="brand-logo" alt="Labor Ready NY Workforce Solutions logo" />'
        + '    <div class="brand-text">'
        + '      <div class="brand-name">Labor Ready <span>NY</span></div>'
        + '      <div class="brand-sub">Workforce Solutions</div>'
        + '    </div>'
        + '  </a>'
        + '  <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation" aria-expanded="false">'
        + '    <span></span><span></span><span></span>'
        + '  </button>'
        + '  <nav id="mainNav" aria-label="Main navigation">'
        + '    <a href="index.html">Home</a>'
        + '    <a href="services.html">Services</a>'
        + '    <a href="index.html#industries">Industries</a>'
        + '    <a href="index.html#clients">Clients</a>'
        + '    <a href="about.html">About</a>'
        + '    <a href="portal.html">Portal</a>'
        + '    <a href="https://payroll.laborreadyny.xyz" target="_blank" rel="noopener noreferrer">Payroll</a>'
        + '    <a href="contact.html">Contact</a>'
        + '  </nav>'
        + '  <a href="portal.html" class="btn-cta btn-sweep">Get Workers Now</a>'
        + '</div>';
    }

    if (footer) {
      footer.innerHTML = ''
        + '<div class="footer-inner">'
        + '  <div>'
        + '    <img src="assets/logo.png" class="footer-logo" alt="Labor Ready NY Workforce Solutions logo" />'
        + '    <h3 class="footer-title">Labor Ready NY Inc</h3>'
        + '    <p>Construction staffing, dispatch, payroll assistance, and workforce support for NYC contractors. Building New York, Ready for Every Job.</p>'
        + '  </div>'
        + '  <div>'
        + '    <h4 class="footer-title">Quick Links</h4>'
        + '    <ul class="footer-links">'
        + '      <li><a href="index.html">Home</a></li>'
        + '      <li><a href="services.html">Services</a></li>'
        + '      <li><a href="about.html">About</a></li>'
        + '      <li><a href="portal.html">Portal</a></li>'
        + '      <li><a href="contact.html">Contact</a></li>'
        + '    </ul>'
        + '  </div>'
        + '  <div>'
        + '    <h4 class="footer-title">Services</h4>'
        + '    <ul class="footer-links">'
        + '      <li><a href="onboarding.html">Client Onboarding</a></li>'
        + '      <li><a href="dispatch.html">Dispatch Request</a></li>'
        + '      <li><a href="apply.html">Worker Application</a></li>'
        + '      <li><a href="https://payroll.laborreadyny.xyz" target="_blank" rel="noopener noreferrer">Payroll Portal</a></li>'
        + '    </ul>'
        + '  </div>'
        + '  <div>'
        + '    <h4 class="footer-title">Contact Info</h4>'
        + '    <ul class="footer-contact-list">'
        + '      <li><strong>Phone:</strong> 718-262-9606</li>'
        + '      <li><strong>Email:</strong> payroll@laborreadyny.xyz</li>'
        + '      <li><strong>Address:</strong> South Ozone Park, NY 11420</li>'
        + '      <li><strong>Service:</strong> 24/7 Dispatch</li>'
        + '    </ul>'
        + '  </div>'
        + '</div>'
        + '<div class="footer-bottom">'
        + '  <div class="footer-bottom-inner">© 2026 Labor Ready NY Inc. All rights reserved. | Licensed & Insured in New York State | Built for Construction Excellence</div>'
        + '</div>';
    }
  }

  injectSharedLayout();

  // Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      const open = mainNav.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Active Link Detection
  document.querySelectorAll('nav a').forEach(function (link) {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const pageWithHash = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase() + (window.location.hash || '').toLowerCase();
    if (
      href === page
      || (page === '' && href === 'index.html')
      || (href === pageWithHash)
    ) {
      link.classList.add('active');
    }
  });

  // Header Scroll Effect
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    });
  }

  // Keep utility actions present on all pages
  if (!document.querySelector('.float-call') && page !== 'payroll.html') {
    const callBtn = document.createElement('a');
    callBtn.href = 'tel:7182629606';
    callBtn.className = 'float-call';
    callBtn.setAttribute('aria-label', 'Call Labor Ready NY Inc');
    callBtn.textContent = '📞';
    document.body.appendChild(callBtn);
  }
  if (!document.getElementById('backToTop') && page !== 'payroll.html') {
    const topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.id = 'backToTop';
    topBtn.className = 'back-to-top';
    topBtn.setAttribute('aria-label', 'Back to top');
    topBtn.textContent = '↑';
    document.body.appendChild(topBtn);
  }

  // Back to Top Button
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Reveal Animations
  const revealTargets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if ('IntersectionObserver' in window && revealTargets.length) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (target) { observer.observe(target); });
  } else {
    revealTargets.forEach(function (target) { target.classList.add('visible'); });
  }

  // Counter Animation
  const counters = document.querySelectorAll('.counter');
  if (counters.length && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const raw = el.getAttribute('data-target') || el.textContent;
          const target = parseInt(String(raw).replace(/[^0-9]/g, ''), 10) || 0;
          const suffix = String(raw).replace(/[0-9,]/g, '').trim();
          const duration = 1400;
          let startTime = null;
          function tick(now) {
            if (!startTime) startTime = now;
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (counter) { counterObserver.observe(counter); });
  }

  // Site-wide ambient construction animation
  if (!document.querySelector('.ambient-construction') && page !== 'payroll.html') {
    const ambient = document.createElement('div');
    ambient.className = 'ambient-construction';
    ambient.setAttribute('aria-hidden', 'true');
    const icons = ['🏗️', '⚙️', '🔨', '⚒️', '🦺', '📐', '🚧', '🧱', '🔩', '🏢'];
    for (let i = 0; i < 34; i += 1) {
      const token = document.createElement('span');
      token.className = 'ambient-icon';
      token.textContent = icons[i % icons.length];
      token.style.left = Math.random() * 100 + '%';
      token.style.top = Math.random() * 100 + '%';
      token.style.animationDelay = (Math.random() * 8).toFixed(2) + 's';
      token.style.animationDuration = (8 + Math.random() * 12).toFixed(2) + 's';
      token.style.fontSize = (14 + Math.random() * 20).toFixed(0) + 'px';
      ambient.appendChild(token);
    }
    document.body.appendChild(ambient);
  }

  // Spread hero construction elements instead of stacking
  const constructionElements = document.querySelector('.construction-elements');
  if (constructionElements) {
    constructionElements.querySelectorAll('.element').forEach(function (el) {
      el.style.left = (5 + Math.random() * 90) + '%';
      el.style.top = (8 + Math.random() * 74) + '%';
      el.style.animationDelay = (Math.random() * 5).toFixed(2) + 's';
      el.style.animationDuration = (7 + Math.random() * 6).toFixed(2) + 's';
    });
  }

  // Floating Particles
  const particleField = document.querySelector('.particle-field');
  if (particleField) {
    for (let i = 0; i < 35; i += 1) {
      const dot = document.createElement('div');
      dot.className = 'particle';
      const size = Math.random() * 5 + 2;
      const opacity = Math.random() * 0.4 + 0.15;
      const duration = Math.random() * 4 + 6;
      dot.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;background:' + (Math.random() > 0.5 ? 'rgba(225,83,31,' + opacity + ')' : 'rgba(255,165,0,' + opacity + ')') + ';animation: float ' + duration + 's ease-in-out infinite;';
      particleField.appendChild(dot);
    }
  }

  // Accordion Functionality
  document.querySelectorAll('.accordion-item').forEach(function (item) {
    const header = item.querySelector('.accordion-header');
    if (header) {
      header.addEventListener('click', function () {
        const wasOpen = item.classList.contains('open');
        // Close all accordion items
        document.querySelectorAll('.accordion-item').forEach(function (i) {
          i.classList.remove('open');
        });
        // Open clicked item if it wasn't already open
        if (!wasOpen) {
          item.classList.add('open');
        }
      });
    }
  });

  // Form Handling
  document.querySelectorAll('form[data-formspree]').forEach(function (form) {
    const heading = document.querySelector('.page-hero h1');
    const formName = heading ? heading.textContent.trim() : 'Website Form';
    if (!form.querySelector('input[name="_subject"]')) {
      const subject = document.createElement('input');
      subject.type = 'hidden';
      subject.name = '_subject';
      subject.value = 'Labor Ready NY - ' + formName;
      form.appendChild(subject);
    }
    if (!form.querySelector('input[name="source_page"]')) {
      const source = document.createElement('input');
      source.type = 'hidden';
      source.name = 'source_page';
      source.value = window.location.href;
      form.appendChild(source);
    }
    if (!form.querySelector('input[name="submitted_at"]')) {
      const submittedAt = document.createElement('input');
      submittedAt.type = 'hidden';
      submittedAt.name = 'submitted_at';
      submittedAt.value = new Date().toISOString();
      form.appendChild(submittedAt);
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const success = form.querySelector('.form-success');
      const error = form.querySelector('.form-error-msg');
      const originalLabel = btn ? btn.textContent : '';
      if (btn) {
        btn.textContent = 'Sending…';
        btn.disabled = true;
      }
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (response) {
          if (response.ok) {
            if (success) {
              success.style.display = 'block';
              form.reset();
            }
          } else {
            throw new Error('Send failed');
          }
        })
        .catch(function () {
          if (error) error.style.display = 'block';
        })
        .finally(function () {
          if (btn) {
            btn.textContent = originalLabel;
            btn.disabled = false;
          }
        });
    });
  });

  // Timesheet Calculator
  function calcTimesheet() {
    let total = 0;
    document.querySelectorAll('.ts-hours').forEach(function (input) {
      total += parseFloat(input.value) || 0;
    });
    const output = document.getElementById('tsTotal');
    if (output) output.textContent = total.toFixed(1) + ' hrs';
  }
  document.querySelectorAll('.ts-hours').forEach(function (input) {
    input.addEventListener('input', calcTimesheet);
  });
})();
