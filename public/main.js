(function () {
  const routes = {
    home: '/',
    services: '/services',
    industries: '/industries',
    clients: '/clients',
    about: '/about',
    portal: '/portal',
    contact: '/contact',
    dispatch: '/dispatch',
    onboarding: '/onboarding',
    apply: '/apply',
    payroll: '/payroll'
  };

  function currentPageKey() {
    const rawPath = (window.location.pathname || '/').toLowerCase();
    const cleaned = rawPath.replace(/\/+$/, '') || '/';
    if (cleaned === '/' || cleaned === '/index.html') return 'home';
    const htmlMatch = cleaned.match(/^\/([a-z0-9-]+)\.html$/);
    if (htmlMatch) return htmlMatch[1];
    const segmentMatch = cleaned.match(/^\/([a-z0-9-]+)$/);
    if (segmentMatch) return segmentMatch[1];
    return '';
  }

  const pageKey = currentPageKey();

  function injectSharedLayout() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    if (header) {
      header.innerHTML = ''
        + '<div class="header-inner">'
        + '  <a href="/" class="brand">'
        + '    <img src="/assets/logo.png" class="brand-logo" alt="Labor Ready NY Workforce Solutions logo" />'
        + '    <div class="brand-text">'
        + '      <div class="brand-name">Labor Ready <span>NY</span></div>'
        + '      <div class="brand-sub">Workforce Solutions</div>'
        + '    </div>'
        + '  </a>'
        + '  <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation" aria-expanded="false">'
        + '    <span></span><span></span><span></span>'
        + '  </button>'
        + '  <nav id="mainNav" aria-label="Main navigation">'
        + '    <a href="/">Home</a>'
        + '    <a href="/services">Services</a>'
        + '    <a href="/industries">Industries</a>'
        + '    <a href="/clients">Clients</a>'
        + '    <a href="/about">About</a>'
        + '    <a href="/portal">Portal</a>'
        + '    <a href="https://payroll.laborreadyny.xyz" target="_blank" rel="noopener noreferrer">Payroll</a>'
        + '    <a href="/contact">Contact</a>'
        + '  </nav>'
        + '</div>';
    }

    if (footer) {
      footer.innerHTML = ''
        + '<div class="footer-inner">'
        + '  <div>'
        + '    <img src="/assets/logo.png" class="footer-logo" alt="Labor Ready NY Workforce Solutions logo" />'
        + '    <h3 class="footer-title">Labor Ready NY Inc</h3>'
        + '    <p>Construction staffing, dispatch, payroll assistance, and workforce support for NYC contractors. Building New York, Ready for Every Job.</p>'
        + '  </div>'
        + '  <div>'
        + '    <h4 class="footer-title">Quick Links</h4>'
        + '    <ul class="footer-links">'
        + '      <li><a href="/">Home</a></li>'
        + '      <li><a href="/services">Services</a></li>'
        + '      <li><a href="/about">About</a></li>'
        + '      <li><a href="/portal">Portal</a></li>'
        + '      <li><a href="/contact">Contact</a></li>'
        + '      <li><a href="/admin">Admin</a></li>'
        + '    </ul>'
        + '  </div>'
        + '  <div>'
        + '    <h4 class="footer-title">Services</h4>'
        + '    <ul class="footer-links">'
        + '      <li><a href="/onboarding">Client Onboarding</a></li>'
        + '      <li><a href="/dispatch">Dispatch Request</a></li>'
        + '      <li><a href="/apply">Worker Application</a></li>'
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
        + '  <div class="footer-bottom-inner">(c) 2026 Labor Ready NY Inc. All rights reserved. | Licensed & Insured in New York State | Built for Construction Excellence'
        + '    <div class="footer-credit">Design and development by <a href="https://patsldeveloper.com" target="_blank" rel="noopener noreferrer">PATSL Developer LLC</a></div>'
        + '  </div>'
        + '</div>';
    }
  }

  injectSharedLayout();

  if (!document.querySelector('.site-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.className = 'site-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = '<div class="site-backdrop-wave"></div><div class="site-backdrop-vector"></div><div class="site-backdrop-grid"></div>';
    document.body.insertBefore(backdrop, document.body.firstChild);
  }

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
    const href = (link.getAttribute('href') || '').toLowerCase().replace(/\/+$/, '') || '/';
    const currentRoute = routes[pageKey] || '';
    if ((href === '/' && pageKey === 'home') || href === currentRoute) {
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
    for (let i = 0; i < 56; i += 1) {
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
  function closeAccordionItem(item) {
    item.classList.remove('open');
    const content = item.querySelector('.accordion-content');
    if (content) {
      content.style.maxHeight = '0px';
    }
  }

  function openAccordionItem(item) {
    item.classList.add('open');
    const content = item.querySelector('.accordion-content');
    if (content) {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  }

  function scrollToAccordionItem(item) {
    const headerEl = document.querySelector('header');
    const headerOffset = headerEl ? headerEl.offsetHeight + 14 : 90;
    const targetTop = item.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }

  function openAccordionById(id, shouldScroll) {
    const targetItem = document.getElementById(id);
    if (!targetItem || !targetItem.classList.contains('accordion-item')) {
      return false;
    }
    document.querySelectorAll('.accordion-item').forEach(function (item) {
      closeAccordionItem(item);
    });
    openAccordionItem(targetItem);
    if (shouldScroll) {
      scrollToAccordionItem(targetItem);
    }
    return true;
  }

  document.querySelectorAll('.accordion-item').forEach(function (item) {
    const header = item.querySelector('.accordion-header');
    const content = item.querySelector('.accordion-content');
    if (item.classList.contains('open')) {
      openAccordionItem(item);
    } else if (content) {
      content.style.maxHeight = '0px';
    }
    if (header) {
      header.addEventListener('click', function () {
        const wasOpen = item.classList.contains('open');
        // Close all accordion items
        document.querySelectorAll('.accordion-item').forEach(function (i) {
          closeAccordionItem(i);
        });
        // Open clicked item if it wasn't already open
        if (!wasOpen) {
          openAccordionItem(item);
        }
      });

    }
  });

  document.querySelectorAll('.service-media-link[href^="#module-"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      const rawTarget = link.getAttribute('href') || '';
      const targetId = rawTarget.replace('#', '');
      if (!targetId) {
        return;
      }
      const handled = openAccordionById(targetId, true);
      if (handled) {
        event.preventDefault();
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '#' + targetId);
        } else {
          window.location.hash = targetId;
        }
      }
    });
  });

  const initialHash = (window.location.hash || '').replace('#', '');
  if (initialHash.indexOf('module-') === 0) {
    window.requestAnimationFrame(function () {
      openAccordionById(initialHash, true);
    });
  }

  window.addEventListener('resize', function () {
    document.querySelectorAll('.accordion-item.open').forEach(function (item) {
      const content = item.querySelector('.accordion-content');
      if (content) {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });

  function getIntakeConfig() {
    const cfg = window.LRNY_INTAKE_CONFIG || null;
    if (!cfg) {
      return null;
    }
    const hasSupabase =
      cfg.supabaseUrl &&
      cfg.supabaseAnonKey &&
      cfg.supabaseUrl.indexOf('YOUR-PROJECT-REF') === -1 &&
      cfg.supabaseAnonKey.indexOf('YOUR_SUPABASE_ANON_KEY') === -1;
    return {
      hasSupabase: Boolean(hasSupabase),
      supabaseUrl: cfg.supabaseUrl || '',
      supabaseAnonKey: cfg.supabaseAnonKey || '',
      emailEndpoint: cfg.emailEndpoint || 'https://formsubmit.co/ajax/payroll@laborreadyny.xyz'
    };
  }

  function submitToSupabaseIntake(form) {
    const cfg = getIntakeConfig();
    if (!cfg || !cfg.hasSupabase) {
      return Promise.reject(new Error('Supabase intake is not configured'));
    }

    const formData = new FormData(form);
    const payload = {};
    formData.forEach(function (value, key) {
      if (typeof value === 'string') {
        payload[key] = value.trim();
      }
    });

    const submittedAt = payload.submitted_at || new Date().toISOString();
    const requestBody = {
      form_type: payload.form_type || 'general_request',
      source_page: payload.source_page || window.location.href,
      contact_email: payload.email || null,
      contact_phone: payload.phone || payload.contact_phone || null,
      payload: payload,
      submitted_at: submittedAt,
      status: 'new'
    };

    return fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/intake_requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: 'Bearer ' + cfg.supabaseAnonKey,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(requestBody)
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('Supabase intake send failed');
      }
      return response;
    });
  }

  function submitToEmailIntake(form) {
    const cfg = getIntakeConfig();
    const formData = new FormData(form);
    if (!formData.get('_captcha')) {
      formData.append('_captcha', 'false');
    }
    if (!formData.get('_template')) {
      formData.append('_template', 'table');
    }
    if (!formData.get('_replyto') && formData.get('email')) {
      formData.append('_replyto', String(formData.get('email')));
    }

    return fetch((cfg && cfg.emailEndpoint) || 'https://formsubmit.co/ajax/payroll@laborreadyny.xyz', {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json'
      }
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('Email intake send failed');
      }
      return response;
    });
  }

  // Form Handling
  document.querySelectorAll('form[data-intake-form]').forEach(function (form) {
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
        btn.textContent = 'Sending...';
        btn.disabled = true;
      }
      const submittedAt = form.querySelector('input[name="submitted_at"]');
      if (submittedAt) {
        submittedAt.value = new Date().toISOString();
      }
      const cfg = getIntakeConfig();
      const submitRequest = cfg && cfg.hasSupabase
        ? submitToSupabaseIntake(form).catch(function () {
            return submitToEmailIntake(form);
          })
        : submitToEmailIntake(form);
      submitRequest
        .then(function () {
          if (success) {
            success.style.display = 'block';
            form.reset();
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

  function setupClickableCards() {
    document.querySelectorAll('.industry-card, .client-card, .borough-card, .service-media-card, .portal-card, .process-step, .value-card').forEach(function (card) {
      const link = card.querySelector('a[href]');
      if (!link) {
        return;
      }
      if (card.dataset.clickableBound === 'true') {
        return;
      }
      card.dataset.clickableBound = 'true';
      card.classList.add('clickable-card');
      card.addEventListener('click', function (event) {
        if (event.target && event.target.closest('a, button, input, textarea, select, label')) {
          return;
        }
        window.location.href = link.href;
      });
    });
  }

  setupClickableCards();

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
