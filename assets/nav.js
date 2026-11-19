document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  // --- Build Divisions dropdown ---
  var divisionsLink = nav.querySelector('a[href="/divisions/"]');
  if (divisionsLink) {
    var wrapper = document.createElement('div');
    wrapper.className = 'nav-dropdown';
    wrapper.setAttribute('role', 'navigation');
    wrapper.setAttribute('aria-label', 'Divisions menu');

    // Move the existing Divisions anchor into wrapper
    divisionsLink.parentNode.insertBefore(wrapper, divisionsLink);
    divisionsLink.setAttribute('aria-haspopup', 'true');
    divisionsLink.setAttribute('aria-expanded', 'false');
    wrapper.appendChild(divisionsLink);

    // Build dropdown menu
    var menu = document.createElement('div');
    menu.className = 'nav-dropdown-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML =
      '<a href="/divisions/ab-facilities-consultants/" role="menuitem" tabindex="-1">AB Facilities Consultants</a>' +
      '<hr>' +
      '<a href="/divisions/ab-cleaning/" role="menuitem" tabindex="-1">AB Cleaning</a>' +
      '<a href="/divisions/ab-technical/" role="menuitem" tabindex="-1">AB Technical</a>' +
      '<a href="/divisions/ab-property/" role="menuitem" tabindex="-1">AB Property</a>' +
      '<hr>' +
      '<a href="/divisions/ab-group/" role="menuitem" tabindex="-1">AB Group</a>';
    wrapper.appendChild(menu);

    var menuLinks = Array.from(menu.querySelectorAll('a[role="menuitem"]'));

    function openDropdown() {
      wrapper.classList.add('open');
      divisionsLink.setAttribute('aria-expanded', 'true');
      menuLinks.forEach(function (a) { a.setAttribute('tabindex', '0'); });
    }

    function closeDropdown() {
      wrapper.classList.remove('open');
      divisionsLink.setAttribute('aria-expanded', 'false');
      menuLinks.forEach(function (a) { a.setAttribute('tabindex', '-1'); });
    }

    function isOpen() {
      return wrapper.classList.contains('open');
    }

    function isMobile() {
      return window.innerWidth <= 860;
    }

    // Desktop: click the Divisions link toggles the dropdown
    // (hover also opens it via CSS; this keeps it open after the click so users
    //  can move the mouse down into the menu without it disappearing)
    divisionsLink.addEventListener('click', function (e) {
      if (isMobile()) {
        // On mobile the full-screen nav is open; tap toggles sub-list
        e.preventDefault();
        if (isOpen()) { closeDropdown(); } else { openDropdown(); }
      } else {
        // On desktop: allow normal navigation to /divisions/ on a second click
        // (first click opens if closed; if already open let the link through)
        if (!isOpen()) {
          e.preventDefault();
          openDropdown();
          divisionsLink.focus();
        }
        // If already open, the click navigates normally to /divisions/
      }
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        closeDropdown();
      }
    });

    // Close on Escape; return focus to trigger
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        closeDropdown();
        divisionsLink.focus();
      }
    });

    // Keyboard: open with Enter/Space on the trigger; arrow-key navigation inside menu
    divisionsLink.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!isMobile()) {
          e.preventDefault();
          if (isOpen()) {
            closeDropdown();
          } else {
            openDropdown();
            menuLinks[0] && menuLinks[0].focus();
          }
        }
      }
      if (e.key === 'ArrowDown' && !isMobile()) {
        e.preventDefault();
        openDropdown();
        menuLinks[0] && menuLinks[0].focus();
      }
    });

    // Arrow-key navigation within menu items
    menu.addEventListener('keydown', function (e) {
      var focused = document.activeElement;
      var idx = menuLinks.indexOf(focused);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = menuLinks[idx + 1] || menuLinks[0];
        next && next.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = menuLinks[idx - 1] || menuLinks[menuLinks.length - 1];
        prev && prev.focus();
      }
      if (e.key === 'Tab') {
        // Let Tab close the dropdown naturally as focus leaves
        closeDropdown();
      }
    });

    // Close when a menu link is focused out to something outside the wrapper
    wrapper.addEventListener('focusout', function (e) {
      // relatedTarget is null if focus leaves the document entirely
      if (!wrapper.contains(e.relatedTarget)) {
        closeDropdown();
      }
    });
  }

  // --- Mobile hamburger toggle ---
  function setOpen(isOpen) {
    nav.classList.toggle('open', isOpen);
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  // Close mobile nav when a top-level (non-dropdown) link is tapped
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
