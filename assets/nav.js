document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  // --- Build Divisions dropdown ---
  var divisionsLink = nav.querySelector('a[href="/divisions/"]');
  if (divisionsLink) {

    // 1. Create the wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'nav-dropdown';

    // 2. Move the existing "Divisions" anchor into wrapper (it stays a plain link)
    divisionsLink.parentNode.insertBefore(wrapper, divisionsLink);
    wrapper.appendChild(divisionsLink);

    // 3. Create a separate arrow button that owns the open/close behaviour
    var arrowBtn = document.createElement('button');
    arrowBtn.type = 'button';
    arrowBtn.className = 'nav-dropdown-arrow';
    arrowBtn.setAttribute('aria-label', 'Open divisions menu');
    arrowBtn.setAttribute('aria-expanded', 'false');
    arrowBtn.setAttribute('aria-haspopup', 'true');
    arrowBtn.innerHTML = '<svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true"><path d="M0 0l5 6 5-6z"/></svg>';
    wrapper.appendChild(arrowBtn);

    // 4. Build dropdown menu
    var menu = document.createElement('div');
    menu.className = 'nav-dropdown-menu';
    menu.setAttribute('role', 'menu');
    var linkDefs = [
      { href: '/divisions/ab-facilities-consultants/', label: 'AB Facilities Consultants' },
      null, // hr
      { href: '/divisions/ab-cleaning/',   label: 'AB Cleaning' },
      { href: '/divisions/ab-technical/',  label: 'AB Technical' },
      { href: '/divisions/ab-property/',   label: 'AB Property' },
      null, // hr
      { href: '/divisions/ab-group/',      label: 'AB Group' }
    ];
    linkDefs.forEach(function (def) {
      if (!def) {
        var hr = document.createElement('hr');
        menu.appendChild(hr);
      } else {
        var a = document.createElement('a');
        a.href = def.href;
        a.textContent = def.label;
        a.setAttribute('role', 'menuitem');
        menu.appendChild(a);
      }
    });
    wrapper.appendChild(menu);

    var menuLinks = Array.from(menu.querySelectorAll('a[role="menuitem"]'));

    function openMenu() {
      wrapper.classList.add('open');
      arrowBtn.setAttribute('aria-expanded', 'true');
      arrowBtn.setAttribute('aria-label', 'Close divisions menu');
    }

    function closeMenu(returnFocus) {
      wrapper.classList.remove('open');
      arrowBtn.setAttribute('aria-expanded', 'false');
      arrowBtn.setAttribute('aria-label', 'Open divisions menu');
      if (returnFocus) arrowBtn.focus();
    }

    function isOpen() {
      return wrapper.classList.contains('open');
    }

    function isMobile() {
      return window.innerWidth <= 860;
    }

    // 5. Arrow button: toggle on click
    arrowBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isOpen()) { closeMenu(false); } else { openMenu(); }
    });

    // 6. On mobile, tapping the Divisions link also toggles (shows sub-links in-line)
    divisionsLink.addEventListener('click', function (e) {
      if (isMobile()) {
        e.preventDefault();
        if (isOpen()) { closeMenu(false); } else { openMenu(); }
      }
      // On desktop the link navigates normally to /divisions/
    });

    // 7. Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target) && isOpen()) {
        closeMenu(false);
      }
    });

    // 8. Escape closes and returns focus to arrow button
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        closeMenu(true);
      }
    });

    // 9. Keyboard: open with Enter/Space/ArrowDown on the arrow button
    arrowBtn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isOpen()) {
          closeMenu(false);
        } else {
          openMenu();
          if (menuLinks[0]) menuLinks[0].focus();
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu();
        if (menuLinks[0]) menuLinks[0].focus();
      }
    });

    // 10. Arrow-key / Tab navigation within the menu
    menu.addEventListener('keydown', function (e) {
      var focused = document.activeElement;
      var idx = menuLinks.indexOf(focused);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        (menuLinks[idx + 1] || menuLinks[0]).focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        (menuLinks[idx - 1] || menuLinks[menuLinks.length - 1]).focus();
      }
      // Tab: allow normal tab order through links; close when focus leaves wrapper
    });

    // 11. Close when focus leaves the entire wrapper
    wrapper.addEventListener('focusout', function (e) {
      // relatedTarget is null when focus leaves the page entirely
      if (!e.relatedTarget || !wrapper.contains(e.relatedTarget)) {
        // Small delay so a click on a menu link fires before we close
        setTimeout(function () {
          if (!wrapper.contains(document.activeElement)) {
            closeMenu(false);
          }
        }, 50);
      }
    });
  }

  // --- Mobile hamburger toggle ---
  function setNavOpen(open) {
    nav.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setNavOpen(!nav.classList.contains('open'));
  });

  // Close mobile nav when a top-level (non-dropdown) link is tapped
  nav.querySelectorAll('a:not(.nav-dropdown a)').forEach(function (a) {
    a.addEventListener('click', function () { setNavOpen(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setNavOpen(false);
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
