document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  // --- Build Divisions dropdown ---
  var divisionsLink = nav.querySelector('a[href="/divisions/"]');
  if (divisionsLink) {
    var wrapper = document.createElement('div');
    wrapper.className = 'nav-dropdown';

    // Move the existing Divisions anchor into wrapper
    divisionsLink.parentNode.insertBefore(wrapper, divisionsLink);
    wrapper.appendChild(divisionsLink);

    // Build dropdown menu
    var menu = document.createElement('div');
    menu.className = 'nav-dropdown-menu';
    menu.innerHTML =
      '<a href="/divisions/ab-facilities-consultants/">AB Facilities Consultants</a>' +
      '<hr>' +
      '<a href="/divisions/ab-cleaning/">AB Cleaning</a>' +
      '<a href="/divisions/ab-technical/">AB Technical</a>' +
      '<a href="/divisions/ab-property/">AB Property</a>' +
      '<hr>' +
      '<a href="/divisions/ab-group/">AB Group</a>';
    wrapper.appendChild(menu);

    // Mobile: tap Divisions link to toggle dropdown sub-items
    var isMobile = function () { return window.innerWidth <= 860; };
    divisionsLink.addEventListener('click', function (e) {
      if (isMobile()) {
        e.preventDefault();
        wrapper.classList.toggle('open');
      }
    });

    // Close dropdown on outside click (desktop)
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') wrapper.classList.remove('open');
    });
  }

  function setOpen(isOpen) {
    nav.classList.toggle('open', isOpen);
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  nav.querySelectorAll('a:not(.nav-dropdown a)').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
});

document.addEventListener('DOMContentLoaded', function () {
  // Skip-to-content link
  var skip = document.createElement('a');
  skip.href = '#';
  skip.className = 'skip-link';
  skip.textContent = 'Skip to main content';
  skip.addEventListener('click', function (e) {
    e.preventDefault();
    var header = document.querySelector('header.site');
    var target = header ? header.nextElementSibling : document.body.firstElementChild;
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.body.insertBefore(skip, document.body.firstChild);

  // Back-to-top button
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>';
  document.body.appendChild(btn);

  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
