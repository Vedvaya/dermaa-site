/*
 * Dermaa homepage — the hero, the scroll tour Sage leads, and the three
 * try-it demos. Needs assets/sage.js loaded first (it creates the Sage
 * instances this file drives).
 *
 * Nothing here talks to a server. Demo taps reach analytics only as ordinary
 * `click` events, through the data-track labels track.js already listens for.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = /(^|\s)reduce(\s|$)/.test(root.className);

  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sageOf(canvas) { return canvas ? canvas.__sage : null; }

  /**
   * Types `text` into `el`. The whole sentence is laid out from the first
   * frame with the untyped tail transparent — the same trick the app tour
   * uses — so the box never grows a line at a time and a screen reader gets
   * the full line at once. Returns a function that cancels it.
   */
  function typeInto(el, text, opts) {
    opts = opts || {};
    var typed = $('.typed', el), untyped = $('.untyped', el);
    if (!typed) {
      typed = document.createElement('span'); typed.className = 'typed';
      untyped = document.createElement('span'); untyped.className = 'untyped';
      el.textContent = '';
      el.appendChild(typed); el.appendChild(untyped);
    }
    if (reduce) {
      typed.textContent = text; untyped.textContent = '';
      if (opts.onDone) opts.onDone();
      return function () {};
    }
    var cps = opts.cps || 42, shown = -1, start = performance.now(), raf = 0, stopped = false;
    function step(now) {
      if (stopped) return;
      var n = Math.min(text.length, Math.floor(((now - start) / 1000) * cps));
      if (n !== shown) {
        shown = n;
        typed.textContent = text.slice(0, n);
        untyped.textContent = text.slice(n);
      }
      if (n < text.length) raf = requestAnimationFrame(step);
      else if (opts.onDone) opts.onDone();
    }
    raf = requestAnimationFrame(step);
    return function () { stopped = true; cancelAnimationFrame(raf); };
  }

  // ── The theme section's phone shows a copy of the hero's Home screen ──
  var cloneHost = $('.phone[data-clone="home"] .phone-screen');
  var homeScreen = $('.hero .screen[data-screen="home"]');
  if (cloneHost && homeScreen) cloneHost.appendChild(homeScreen.cloneNode(true));

  $$('.m-cal').forEach(function (cal) {
    $$('i', cal).forEach(function (dot, i) { dot.style.setProperty('--n', i); });
  });

  // ── Phones come alive (rings draw, bars fill) when they scroll into view ──
  var phones = $$('.phone[data-live]');
  if ('IntersectionObserver' in window && !reduce) {
    var phoneIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('live');
        phoneIo.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    phones.forEach(function (p) { phoneIo.observe(p); });
  } else {
    phones.forEach(function (p) { p.classList.add('live'); });
  }

  // ── Hero: the phone and the leaves lean toward the pointer ──
  var hero = $('.hero');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hero && !reduce && finePointer) {
    var px = 0, py = 0, heroQueued = false;
    var paintHero = function () {
      heroQueued = false;
      hero.style.setProperty('--px', px.toFixed(3));
      hero.style.setProperty('--py', py.toFixed(3));
    };
    hero.addEventListener('pointermove', function (ev) {
      var r = hero.getBoundingClientRect();
      px = clamp(((ev.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      py = clamp(((ev.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
      if (!heroQueued) { heroQueued = true; requestAnimationFrame(paintHero); }
    });
    hero.addEventListener('pointerleave', function () {
      px = 0; py = 0;
      if (!heroQueued) { heroQueued = true; requestAnimationFrame(paintHero); }
    });
  }
  var heroSage = sageOf($('#hero-sage'));
  if (heroSage) setTimeout(function () { heroSage.set({ pose: 'idle' }); }, 4600);

  // ── The tour: a pinned phone, five chapters, and Sage hopping between them ──
  (function () {
    var tour = $('.tour');
    if (!tour) return;
    var stage = $('.tour-stage', tour);
    var phone = $('.tour-phone .phone', tour);
    var screens = $$('.tour-phone .screen', tour);
    var chapters = $$('.chapter', tour);
    var bars = $$('.tour-bars button', tour);
    var sageEl = $('.tour-sage', tour);
    var bubble = $('.tour-bubble', tour);
    var sage = sageOf($('#tour-sage'));
    if (!stage || !phone || !chapters.length) return;

    // How far down the phone Sage stands for each chapter, and how it holds itself.
    var anchors = [0.30, 0.58, 0.34, 0.44, 0.40];
    var poses = ['idle', 'idle', 'idle', 'wave', 'cheer'];
    var mobile = window.matchMedia('(max-width: 860px)');
    var active = -1, seq = 0, pos = { x: 0, y: 0 }, cancelType = null, raf = 0;

    function sageSize() { return mobile.matches ? 64 : 96; }
    function target(i) {
      var s = sageSize();
      return { x: -s * (mobile.matches ? 0.6 : 0.7), y: phone.offsetHeight * anchors[i] - s / 2 };
    }
    function place(p) {
      pos = p;
      sageEl.style.setProperty('--sx', p.x.toFixed(1) + 'px');
      sageEl.style.setProperty('--sy', p.y.toFixed(1) + 'px');
    }
    function speak(i) {
      if (cancelType) cancelType();
      bubble.classList.remove('hide');
      if (sage) sage.set({ pose: poses[i], talking: !reduce, stretch: 1, tilt: 0 });
      cancelType = typeInto(bubble, chapters[i].getAttribute('data-say') || '', {
        onDone: function () { if (sage) sage.set({ talking: false }); }
      });
    }

    // Leaving → travelling → landing → speaking, as in the app tour. `seq`
    // guards every frame, so two quick scrolls cannot leave two leaps fighting.
    function leap(i, instant) {
      var mine = ++seq;
      cancelAnimationFrame(raf);
      if (cancelType) { cancelType(); cancelType = null; }
      var to = target(i);
      if (instant || reduce || !sage) { place(to); speak(i); return; }

      var from = { x: pos.x, y: pos.y };
      var dir = to.y >= from.y ? 1 : -1;
      var start = performance.now();
      bubble.classList.add('hide');
      sage.set({ talking: false, pose: 'idle' });

      function travel(now) {
        if (mine !== seq) return;
        var u = clamp((now - start) / 620, 0, 1);
        var e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        var arc = Math.sin(Math.PI * u);
        place({ x: from.x + (to.x - from.x) * e - arc * 34, y: from.y + (to.y - from.y) * e - arc * 16 });
        sage.set({ stretch: 1 + arc * 0.2, tilt: -dir * arc * 0.22 });
        if (u < 1) { raf = requestAnimationFrame(travel); return; }
        var landed = now;
        (function land(n) {
          if (mine !== seq) return;
          var v = clamp((n - landed) / 260, 0, 1);
          sage.set({ stretch: 1 - Math.sin(Math.PI * v) * 0.16, tilt: 0 });
          if (v < 1) raf = requestAnimationFrame(land);
          else speak(i);
        })(now);
      }
      raf = requestAnimationFrame(travel);
    }

    function setActive(i, instant) {
      if (i === active) return;
      active = i;
      chapters.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
      screens.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      bars.forEach(function (b, k) {
        b.classList.toggle('on', k === i);
        b.classList.toggle('done', k < i);
        if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      leap(i, instant);
    }

    // The chapter under the reading line: mid-screen on desktop, and the middle
    // of what is left below the pinned phone on a phone.
    function pick() {
      var vh = window.innerHeight, focus = vh * 0.5;
      if (mobile.matches) {
        var bottom = stage.getBoundingClientRect().bottom;
        focus = bottom + (vh - bottom) * 0.5;
      }
      var best = 0, bestDist = Infinity;
      chapters.forEach(function (c, k) {
        var r = c.getBoundingClientRect();
        var d = focus < r.top ? r.top - focus : focus > r.bottom ? focus - r.bottom : 0;
        if (d < bestDist) { bestDist = d; best = k; }
      });
      return best;
    }

    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; setActive(pick(), false); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    bars.forEach(function (b, k) {
      b.addEventListener('click', function () {
        // Bring the chapter's middle to the reading line pick() uses, which on
        // a phone sits below the pinned stage rather than mid-screen.
        var vh = window.innerHeight, line = vh * 0.5;
        if (mobile.matches) {
          var bottom = stage.getBoundingClientRect().bottom;
          line = bottom + (vh - bottom) * 0.5;
        }
        var cr = chapters[k].getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + cr.top + cr.height / 2 - line, behavior: reduce ? 'auto' : 'smooth' });
      });
    });

    function layout() {
      if (sage) { sage.resize(sageSize()); sage.lookAt(0.9, 0.15); }
      place(target(active < 0 ? 0 : active));
    }
    layout();
    setActive(pick(), true);
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    if (mobile.addEventListener) mobile.addEventListener('change', layout);
  })();

  // ── Demo 1: tick off a ritual ──
  (function () {
    var demo = $('[data-demo="routine"]');
    if (!demo) return;
    var lists = { morning: $('[data-steps="morning"]', demo), evening: $('[data-steps="evening"]', demo) };
    var arcs = $('.demo-arcs', demo);
    var count = $('[data-count]', demo);
    var label = $('[data-period-label]', demo);
    var msg = $('[data-msg]', demo);
    var sage = sageOf($('.demo-sage', demo));
    var period = 'morning';

    function items(p) { return $$('li', lists[p]); }
    function done(p) { return items(p).filter(function (li) { return li.classList.contains('done'); }); }

    // The one line under the path. Derived from the state, never a canned cheer.
    function line(n, total, bothDone, next) {
      if (bothDone) return "Both rituals done. That's a day on your streak.";
      if (n === total) return period === 'morning' ? 'Morning ritual done. Evening is waiting.' : 'Evening ritual done. Morning is still open.';
      if (n === 0) return 'Start with the first step.';
      return 'Next: ' + next + '.';
    }

    function render() {
      var next = '';
      ['morning', 'evening'].forEach(function (p) {
        var found = false;
        items(p).forEach(function (li) {
          var isDone = li.classList.contains('done');
          var current = !isDone && !found;
          if (current) { found = true; if (p === period) next = $('.step-text b', li).textContent; }
          li.classList.toggle('current', current);
          $('.step', li).setAttribute('aria-pressed', isDone ? 'true' : 'false');
        });
      });
      var am = done('morning').length, pm = done('evening').length;
      var totalAm = items('morning').length, totalPm = items('evening').length;
      arcs.style.setProperty('--am', (am / totalAm) * 100);
      arcs.style.setProperty('--pm', (pm / totalPm) * 100);
      var n = period === 'morning' ? am : pm, total = period === 'morning' ? totalAm : totalPm;
      count.textContent = n + ' of ' + total;
      label.textContent = period + ' steps';
      msg.textContent = line(n, total, am === totalAm && pm === totalPm, next);
      return n === total;
    }

    demo.addEventListener('click', function (ev) {
      var step = ev.target.closest('.step');
      if (step) {
        var li = step.parentNode;
        var wasComplete = done(period).length === items(period).length;
        li.classList.toggle('done');
        var complete = render();
        if (complete && !wasComplete && sage) sage.cheer(2400);
        return;
      }
      var tab = ev.target.closest('[data-period]');
      if (tab) {
        period = tab.getAttribute('data-period');
        $$('[data-period]', demo).forEach(function (b) {
          var on = b === tab;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        lists.morning.hidden = period !== 'morning';
        lists.evening.hidden = period !== 'evening';
        render();
      }
    });
    render();
  })();

  // ── Demo 2: build a skin score ──
  // The same model as the app's computeDayScore() (lib/utils/skin_score.dart):
  // a photo outweighs everything else, mood and symptoms still count, and
  // without a photo the last measurement carries over, fading by the day.
  (function () {
    var demo = $('[data-demo="score"]');
    if (!demo) return;

    var MOOD = { irritated: 32, okay: 55, good: 74, amazing: 90 };
    var POSITIVE = { Glow: true, Smooth: true, Clear: true };
    var W_ANALYSIS = 6, W_MOOD = 1, W_SYMPTOMS = 1, W_CARRY = 1.2;
    var SYMPTOM_BASE = 60, SYMPTOM_LIFT = 8, SYMPTOM_DRAG = 9;
    var CARRY_DECAY = 0.78, ANCHOR_HORIZON = 7;
    // The sample numbers the demo's fine print states.
    var SAMPLE = { lastMeasured: 72, daysSince: 3, analysis: 76 };
    var BASIS = {
      measured: 'Measured today',
      reported: 'Estimated from how you logged',
      estimated: 'Rough estimate'
    };

    function compute(mood, symptoms, selfie) {
      var weighted = 0, total = 0, inputs = [];
      if (selfie) { weighted += SAMPLE.analysis * W_ANALYSIS; total += W_ANALYSIS; inputs.push('Photo analysis'); }
      if (mood) { weighted += MOOD[mood] * W_MOOD; total += W_MOOD; inputs.push('How it felt'); }
      if (symptoms.length) {
        var w = W_SYMPTOMS * Math.min(1, symptoms.length * 0.5);
        var v = SYMPTOM_BASE;
        symptoms.forEach(function (s) { v += POSITIVE[s] ? SYMPTOM_LIFT : -SYMPTOM_DRAG; });
        weighted += clamp(v, 15, 95) * w; total += w;
        inputs.push(symptoms.length === 1 ? '1 symptom' : symptoms.length + ' symptoms');
      }
      if (!selfie) {
        var carry = W_CARRY * Math.pow(CARRY_DECAY, SAMPLE.daysSince - 1);
        weighted += SAMPLE.lastMeasured * carry; total += carry;
        inputs.push('Measured ' + SAMPLE.daysSince + ' days ago');
      }
      var basis = selfie ? 'measured' : mood ? 'reported' : 'estimated';
      var measured = basis === 'measured';
      var conf = measured ? 0.85 : basis === 'reported' ? 0.35 : 0.15;
      if (mood) conf += measured ? 0.05 : 0.15;
      if (symptoms.length) conf += measured ? 0.05 : 0.15;
      if (basis === 'reported') conf += 0.2 * clamp(1 - SAMPLE.daysSince / ANCHOR_HORIZON, 0, 1);
      return { score: clamp(weighted / total, 0, 100), basis: basis, confidence: clamp(conf, 0, 1), inputs: inputs };
    }

    var dial = $('.demo-dial', demo), cap = $('.cap', dial);
    var num = $('[data-score]', demo), basisEl = $('[data-basis]', demo), inputsEl = $('[data-inputs]', demo);
    var selfie = $('[data-selfie]', demo);
    var shown = { score: 73, conf: 0.61 }, raf = 0;

    function draw(score, conf) {
      shown.score = score; shown.conf = conf;
      dial.style.setProperty('--v', score.toFixed(2));
      dial.style.setProperty('--c', (conf * 100).toFixed(2));
      var a = (Math.PI * 2 * score) / 100;
      cap.setAttribute('cx', (50 + 46 * Math.cos(a)).toFixed(2));
      cap.setAttribute('cy', (50 + 46 * Math.sin(a)).toFixed(2));
      num.textContent = Math.round(score);
    }

    function update() {
      var moodBtn = $('[data-mood].on', demo);
      var symptoms = $$('[data-symptom].on', demo).map(function (b) { return b.getAttribute('data-symptom'); });
      var r = compute(moodBtn ? moodBtn.getAttribute('data-mood') : null, symptoms, selfie.checked);
      dial.classList.toggle('est', r.basis !== 'measured');
      basisEl.textContent = BASIS[r.basis];
      inputsEl.textContent = r.inputs.join(' · ');
      cancelAnimationFrame(raf);
      if (reduce) { draw(r.score, r.confidence); return; }
      var from = { score: shown.score, conf: shown.conf }, start = performance.now();
      (function tween(now) {
        var u = clamp((now - start) / 520, 0, 1), e = 1 - Math.pow(1 - u, 3);
        draw(from.score + (r.score - from.score) * e, from.conf + (r.confidence - from.conf) * e);
        if (u < 1) raf = requestAnimationFrame(tween);
      })(start);
    }

    demo.addEventListener('click', function (ev) {
      var mood = ev.target.closest('[data-mood]');
      if (mood) {
        $$('[data-mood]', demo).forEach(function (b) {
          var on = b === mood;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        update();
        return;
      }
      var chip = ev.target.closest('[data-symptom]');
      if (chip) {
        var on = !chip.classList.contains('on');
        chip.classList.toggle('on', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        update();
      }
    });
    selfie.addEventListener('change', update);

    var first = compute('good', [], false);
    draw(first.score, first.confidence);
  })();

  // ── Demo 3: ask Sage (scripted example answers — no AI call) ──
  (function () {
    var demo = $('[data-demo="ask"]');
    if (!demo) return;
    var ANSWERS = [
      "Looking at your week: you slept under 6 hours on four nights and logged about half your usual water. Both tend to show up as dullness within days. Your routine has been steady, so I'd start with sleep before changing any products.",
      "Yes, at different times of day. Vitamin C sits well in your morning routine under SPF, and the retinoid stays in the evening. That is how your routine is already set up, so there's nothing to change.",
      "Your morning routine ends with SPF 30+, and you've done it five of the last seven days. The gap matters more than the number: daily use is what protects against the pigmentation you're tracking."
    ];
    var log = $('[data-log]', demo);
    var buttons = $$('[data-q]', demo);
    var sage = sageOf($('.demo-sage', demo));
    var busy = false;

    function add(cls, text) {
      var row = document.createElement('div');
      row.className = 'msg ' + cls;
      var p = document.createElement('p');
      if (text) p.textContent = text;
      row.appendChild(p);
      log.appendChild(row);
      return p;
    }

    demo.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-q]');
      if (!btn || busy) return;
      busy = true;
      buttons.forEach(function (b) { b.disabled = true; });
      add('me', btn.textContent);
      var p = add('sage', '');
      if (sage) sage.set({ talking: !reduce });
      typeInto(p, ANSWERS[+btn.getAttribute('data-q')] || '', {
        cps: 58,
        onDone: function () {
          busy = false;
          btn.classList.add('used');
          buttons.forEach(function (b) { b.disabled = false; });
          if (sage) sage.set({ talking: false });
        }
      });
      log.scrollTop = log.scrollHeight;
    });
  })();

  // ── Sage on the download band cheers when a sign-up goes through ──
  // Watches the status line track.js writes, so that file needs no change.
  (function () {
    var bandSage = sageOf($('#band-sage'));
    var status = $('#download [data-lead-status]');
    if (!bandSage || !status || !('MutationObserver' in window)) return;
    new MutationObserver(function () {
      if (/(^|\s)ok(\s|$)/.test(status.className) && /on the list/.test(status.textContent)) bandSage.cheer(3000);
    }).observe(status, { attributes: true, childList: true, characterData: true, subtree: true });
  })();
})();
