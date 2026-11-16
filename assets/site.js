/*
 * Dermaa site — behaviour shared by every page: the light/dark toggle, the
 * mobile menu, the nav's scrolled state and scroll-reveal.
 *
 * The theme itself is set by a tiny inline script in each page's <head>, so it
 * is right before first paint. This file only handles changing it. The choice
 * is kept in localStorage as `dermaa_theme` (described at
 * privacy.html#website — change one, change the other).
 */
(function () {
  'use strict';

  var root = document.documentElement;
  // The <head> script drops the `js` class again if this never runs, so a
  // failed load cannot leave scroll-reveal content hidden.
  window.__dermaaReady = true;

  // ── Theme ──
  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function storedTheme() {
    try {
      var t = localStorage.getItem('dermaa_theme');
      return t === 'light' || t === 'dark' ? t : null;
    } catch (e) { return null; }
  }
  function syncToggles(theme) {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    var sets = document.querySelectorAll('[data-theme-set]');
    for (var j = 0; j < sets.length; j++) {
      var on = sets[j].getAttribute('data-theme-set') === theme;
      sets[j].classList.toggle('on', on);
      sets[j].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#12140F' : '#F5F0EB');
  }
  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem('dermaa_theme', theme); } catch (e) {}
    }
    syncToggles(theme);
    // Canvases (Sage) cannot read CSS variables on their own — tell them.
    try { document.dispatchEvent(new CustomEvent('dermaa:theme', { detail: theme })); } catch (e) {}
  }
  syncToggles(currentTheme());

  document.addEventListener('click', function (ev) {
    if (!ev.target || !ev.target.closest) return;
    if (ev.target.closest('[data-theme-toggle]')) {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
      return;
    }
    // A control that names the theme it wants (the homepage's Light/Dark switch).
    var set = ev.target.closest('[data-theme-set]');
    if (set) applyTheme(set.getAttribute('data-theme-set') === 'dark' ? 'dark' : 'light', true);
  });

  // Until the visitor chooses, keep following the system.
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystem = function (e) { if (!storedTheme()) applyTheme(e.matches ? 'dark' : 'light', false); };
    if (mq.addEventListener) mq.addEventListener('change', onSystem);
    else if (mq.addListener) mq.addListener(onSystem);
  }

  // ── Mobile menu ──
  var menuBtn = document.querySelector('.nav-menu');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    if (!menuBtn || !links) return;
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () {
      setMenu(!links.classList.contains('open'));
    });
    links.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', function (ev) {
      if (!links.classList.contains('open')) return;
      if (ev.target.closest && (ev.target.closest('.nav-menu') || ev.target.closest('#nav-links'))) return;
      setMenu(false);
    });
  }

  // ── Nav hairline once the page has scrolled ──
  var nav = document.querySelector('.nav');
  if (nav) {
    var navQueued = false;
    var syncNav = function () {
      navQueued = false;
      nav.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', function () {
      if (navQueued) return;
      navQueued = true;
      requestAnimationFrame(syncNav);
    }, { passive: true });
    syncNav();
  }

  // ── Scroll reveal ──
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    if (!('IntersectionObserver' in window) || /(^|\s)reduce(\s|$)/.test(root.className)) {
      for (var r = 0; r < revealEls.length; r++) revealEls[r].classList.add('in');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      for (var k = 0; k < revealEls.length; k++) io.observe(revealEls[k]);
    }
  }
})();
