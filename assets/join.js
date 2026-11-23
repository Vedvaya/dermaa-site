/*
 * Dermaa launch-offer page (/join): "Will you go on a date with Dermaa?"
 *
 * Three stages on one card: ask → email → done. "No" runs away a handful of
 * times with a playful line each time, then gives up and leaves; a press on it
 * is never recorded as an answer. "Yes" opens the email step, which is the
 * site's ordinary launch sign-up form (track.js posts it). When track.js
 * reports a save (`dermaa:lead-saved`), the page celebrates.
 *
 * Needs sage.js loaded first (it creates the Sage instance this drives).
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = /(^|\s)reduce(\s|$)/.test(root.className);
  var card = document.getElementById('join');
  if (!card) return;

  function $(sel) { return card.querySelector(sel); }
  var yes = $('[data-yes]');
  var no = $('[data-no]');
  var note = $('[data-note]');
  var live = $('[data-no-live]');
  // No roams below the heading, so the question itself is never covered.
  var roamTop = $('.stage-ask .offer');
  var bubble = document.getElementById('join-bubble');
  var sageCanvas = document.getElementById('join-sage');
  function sage() { return sageCanvas ? sageCanvas.__sage : null; }

  var SHARE_URL = 'https://dermaa.app/join?utm_source=share&utm_medium=referral&utm_campaign=launch_offer';

  // ── The words. The page speaks in the voice of the "first date" post it is
  // linked from: Dermaa as the partner who never ghosts. The jokes tease the
  // No button, never the visitor. Keep a No line to ~24 characters (it must
  // fit the button on a 360px phone) and a Sage line to ~40 (two lines of
  // bubble at most).
  var NO_POOL = [
    'Are you ghosting me? 👻', 'Mixed signals much?', 'Red flag 🚩',
    'Situationship energy', 'Swipe left? Really?', 'I text back, you know',
    'Playing hard to get? 😏', "I'm not your ex 🙄", 'Left on read 💔',
    'Is it something I said?', 'We were vibing though', 'Commitment issues? 👀',
    'Third-wheeling again?', 'Wrong button, babe', 'Even your skin said Yes'
  ];
  var NO_GIVE_UP = ["Fine, it's a date 💌", "Okay okay, I'll wait", 'You win. Date night!'];
  var SAGE_POOL = [
    'Excuse me?? 😳', "I'd never leave you on read.", 'No mixed signals here, promise 💚',
    "I'm literally available 24/7…", 'I already planned our skincare night 🧖',
    'Your bestie is tired of third-wheeling.', "I'm not like other apps 💅",
    "I track your water. That's love.", 'Ghosting me? On our first date?',
    'Your skin already said yes 👀', "I'll pretend I didn't see that.",
    'No drama, just glow. Try Yes.', 'Bold move. Wrong, but bold.', '*dramatic sigh*'
  ];
  var SAGE_GIVE_UP = ["Fine. It's a date then 😉", "I'll take that as a yes 💌"];
  var GONE_NOTES = ['No has left the chat 👋', "Looks like it's a date 😉", 'No ghosted. Yes it is!'];
  var SAY_YES = 'Yay! 💌';
  var SAY_DONE = 'See you on our first date 💚';
  var SHARE_TITLE = 'Will you go on a date with Dermaa? 💌';
  var SHARE_TEXT = 'Found my perfect date: no ghosting, no mixed signals 💚 Sign up before Dermaa launches and get 1 month of Premium free';

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function go(stage) { card.setAttribute('data-stage', stage); }

  function say(text) {
    if (!bubble) return;
    bubble.textContent = text;
    if (reduce) return;
    bubble.classList.remove('bump');
    void bubble.offsetWidth; // restart the pop
    bubble.classList.add('bump');
  }

  // Sage waves hello, then settles.
  setTimeout(function () {
    var s = sage();
    if (s && s.pose === 'wave') s.set({ pose: 'idle' });
  }, 4200);

  // ── The runaway No ──
  // This visit's lines: five drawn without repeats, then one that gives up.
  var MAX_TRIES = 6;
  var NO_LINES = shuffle(NO_POOL).slice(0, MAX_TRIES - 1).concat(pickOne(NO_GIVE_UP));
  var SAGE_LINES = shuffle(SAGE_POOL).slice(0, MAX_TRIES - 1).concat(pickOne(SAGE_GIVE_UP));
  var GONE_NOTE = pickOne(GONE_NOTES);
  var tries = 0, lastDodge = 0, hiding = false;
  var pos = { x: 0, y: 0 };
  var pointer = null;

  // The card is No's containing block once it runs; its coordinates are
  // measured from the card's padding box, hence the clientLeft/Top offsets.
  function inCard(rect) {
    var c = card.getBoundingClientRect();
    var x = c.left + card.clientLeft, y = c.top + card.clientTop;
    return { l: rect.left - x, t: rect.top - y, r: rect.right - x, b: rect.bottom - y };
  }

  function place(p) {
    pos = p;
    no.style.setProperty('--x', p.x.toFixed(1) + 'px');
    no.style.setProperty('--y', p.y.toFixed(1) + 'px');
  }

  function release() {
    if (no.classList.contains('free')) return;
    var r = inCard(no.getBoundingClientRect());
    place({ x: r.l, y: r.t });
    no.classList.add('free');
    void no.offsetWidth; // land where it was before the first leap animates
    no.classList.add('moving');
  }

  // Somewhere clear of Yes, well away from where No was and from the pointer.
  function pickSpot() {
    var W = card.clientWidth, H = card.clientHeight;
    var w = no.offsetWidth, h = no.offsetHeight, pad = 12;
    var top = Math.max(pad, inCard(roamTop.getBoundingClientRect()).t);
    var y = inCard(yes.getBoundingClientRect());
    var keep = 16;
    var ptr = pointer ? inCard({ left: pointer.x, top: pointer.y, right: pointer.x, bottom: pointer.y }) : null;
    var from = { x: pos.x + w / 2, y: pos.y + h / 2 };
    var best = null, bestScore = -1;
    for (var i = 0; i < 60; i++) {
      var x = pad + Math.random() * Math.max(0, W - w - pad * 2);
      var t = top + Math.random() * Math.max(0, H - h - pad - top);
      if (x < y.r + keep && x + w > y.l - keep && t < y.b + keep && t + h > y.t - keep) continue;
      var cx = x + w / 2, cy = t + h / 2;
      var dFrom = Math.hypot(cx - from.x, cy - from.y);
      var dPtr = ptr ? Math.hypot(cx - ptr.l, cy - ptr.t) : Infinity;
      var score = Math.min(dFrom, dPtr);
      if (score > Math.min(170, W * 0.4)) return { x: x, y: t };
      if (score > bestScore) { bestScore = score; best = { x: x, y: t }; }
    }
    return best || pos;
  }

  function lookAtNo() {
    var s = sage();
    if (!s || !sageCanvas) return;
    var a = sageCanvas.getBoundingClientRect(), c = card.getBoundingClientRect();
    var nx = c.left + card.clientLeft + pos.x + no.offsetWidth / 2;
    var ny = c.top + card.clientTop + pos.y + no.offsetHeight / 2;
    s.lookAt((nx - (a.left + a.width / 2)) / 260, (ny - (a.top + a.height / 2)) / 260);
  }

  function dodge() {
    if (no.hidden) return;
    var now = Date.now();
    if (now - lastDodge < 180) return; // one attempt fires pointerenter + pointerdown + click
    lastDodge = now;
    tries = Math.min(tries + 1, MAX_TRIES);

    var line = NO_LINES[tries - 1];
    no.textContent = line;
    live.textContent = 'No button: ' + line;
    say(SAGE_LINES[tries - 1]);
    yes.style.setProperty('--grow', Math.min(1 + 0.1 * tries, 1.6).toFixed(2));
    no.style.setProperty('--shrink', Math.max(1 - 0.08 * tries, 0.55).toFixed(2));

    var s = sage();
    if (s) s.set({ pose: 'curious' });
    if (!reduce) {
      release();
      place(pickSpot());
      lookAtNo();
    }

    if (tries >= MAX_TRIES && !hiding) {
      hiding = true;
      setTimeout(function () {
        no.classList.add('gone');
        note.textContent = GONE_NOTE;
        live.textContent = 'The No button gave up. ' + GONE_NOTE;
        if (document.activeElement === no) yes.focus();
        var sg = sage();
        if (sg) sg.set({ pose: 'wave' });
        setTimeout(function () { no.hidden = true; }, reduce ? 0 : 320);
      }, reduce ? 500 : 1100);
    }
  }

  no.addEventListener('pointerenter', function (e) {
    if (reduce || e.pointerType !== 'mouse') return;
    pointer = { x: e.clientX, y: e.clientY };
    dodge();
  });
  no.addEventListener('pointerdown', function (e) {
    e.preventDefault(); // a touch must never land
    pointer = { x: e.clientX, y: e.clientY };
    dodge();
  });
  // Keyboard (Enter / Space) arrives as a click; so does anything that slips through.
  no.addEventListener('click', function (e) {
    e.preventDefault();
    if (Date.now() - lastDodge > 400) { pointer = null; dodge(); }
  });

  window.addEventListener('resize', function () {
    if (!no.classList.contains('free') || no.hidden) return;
    place({
      x: clamp(pos.x, 12, Math.max(12, card.clientWidth - no.offsetWidth - 12)),
      y: clamp(pos.y, 12, Math.max(12, card.clientHeight - no.offsetHeight - 12))
    });
  });

  // ── Yes ──
  yes.addEventListener('click', function () {
    go('email');
    say(SAY_YES);
    var s = sage();
    if (s) { s.lookAt(0, 0.4); s.cheer(1800); }
    var input = document.getElementById('join-email');
    setTimeout(function () { if (input) input.focus(); }, reduce ? 0 : 320);
  });

  // ── Saved: celebrate ──
  document.addEventListener('dermaa:lead-saved', function (e) {
    if (!card.contains(e.target)) return;
    go('done');
    say(SAY_DONE);
    var s = sage();
    if (s) { clearTimeout(s.cheerTimer); s.set({ pose: 'cheer' }); }
    var h = $('[data-done-heading]');
    if (h) h.focus({ preventScroll: true });
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    celebrate();
  });

  // ── Share ──
  var toastTimer = 0;
  function toast(text) {
    var t = $('[data-toast]');
    if (!t) return;
    t.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.textContent = ''; }, 4000);
  }
  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SHARE_URL).then(
        function () { toast('Link copied ✓'); },
        function () { toast('Copy this link: ' + SHARE_URL); }
      );
    } else {
      toast('Copy this link: ' + SHARE_URL);
    }
  }
  var shareBtn = $('[data-share]');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({
        title: SHARE_TITLE,
        text: SHARE_TEXT,
        url: SHARE_URL
      }).catch(function (err) {
        if (!err || err.name !== 'AbortError') copyLink();
      });
    } else {
      copyLink();
    }
  });

  // ── The celebration: leaves, sparkles and petals in the palette ──
  function colours() {
    var cs = getComputedStyle(root);
    var list = ['--primary', '--gold', '--teal', '--rose', '--primary-strong'].map(function (v) {
      return cs.getPropertyValue(v).trim();
    }).filter(Boolean);
    return list.length ? list : ['#7A9B68', '#C4914A', '#5F7A73', '#B85C5C'];
  }

  function drawPiece(ctx, p) {
    var s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.shape !== 'dot') ctx.scale(1, Math.cos(p.wob)); // a tumble, not a slide
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    if (p.shape === 'leaf') {
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.75, 0, 0, s);
      ctx.quadraticCurveTo(-s * 0.75, 0, 0, -s);
    } else if (p.shape === 'spark') {
      // The four-point sparkle from Sage's mark.
      var r = s * 0.85;
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
      ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
      ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
      ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
    } else if (p.shape === 'heart') {
      var k = s * 0.8;
      ctx.moveTo(0, k * 0.8);
      ctx.bezierCurveTo(-k * 1.2, 0, -k * 0.6, -k * 0.95, 0, -k * 0.35);
      ctx.bezierCurveTo(k * 0.6, -k * 0.95, k * 1.2, 0, 0, k * 0.8);
    } else if (p.shape === 'ribbon') {
      ctx.rect(-s * 0.55, -s * 0.2, s * 1.1, s * 0.4);
    } else {
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  var SHAPES = ['leaf', 'leaf', 'spark', 'heart', 'ribbon', 'dot'];
  var rose = '#B85C5C';
  function piece(x, y, angle, spread, speed, cols) {
    var a = angle + (Math.random() - 0.5) * spread * 2;
    var v = speed[0] + Math.random() * (speed[1] - speed[0]);
    var shape = SHAPES[(Math.random() * SHAPES.length) | 0];
    return {
      x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.3,
      wob: Math.random() * Math.PI * 2, wobS: 0.08 + Math.random() * 0.12,
      size: 6 + Math.random() * 7, alpha: 1,
      shape: shape,
      // Hearts are always rose, whatever the draw.
      color: shape === 'heart' ? rose : cols[(Math.random() * cols.length) | 0]
    };
  }

  function celebrate() {
    var cols = colours();
    rose = getComputedStyle(root).getPropertyValue('--rose').trim() || rose;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cv = document.createElement('canvas');
    cv.className = reduce ? 'confetti still' : 'confetti';
    cv.setAttribute('aria-hidden', 'true');

    if (reduce) {
      // One still frame of scattered leaves and sparkles behind the card's text.
      card.insertBefore(cv, card.firstChild);
      var w = card.clientWidth, h = card.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      var sctx = cv.getContext('2d');
      sctx.scale(dpr, dpr);
      // Round the edges only, so nothing sits behind the words.
      for (var k = 0, placed = 0; placed < 30 && k < 400; k++) {
        var px = Math.random() * w, py = Math.random() * h;
        if (px > w * 0.12 && px < w * 0.88 && py > h * 0.1 && py < h * 0.92) continue;
        var p = piece(px, py, 0, 0, [0, 0], cols);
        p.alpha = 0.4; p.wob = 0;
        drawPiece(sctx, p);
        placed++;
      }
      return;
    }

    document.body.appendChild(cv);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    var c = card.getBoundingClientRect();
    var ox = c.left + c.width / 2, oy = clamp(c.top + 120, 80, H * 0.45);
    var pieces = [], i;
    for (i = 0; i < 90; i++) pieces.push(piece(ox, oy, -Math.PI / 2, 1.2, [8, 17], cols));
    for (i = 0; i < 28; i++) pieces.push(piece(0, H * 0.9, -Math.PI / 3, 0.32, [13, 21], cols));
    for (i = 0; i < 28; i++) pieces.push(piece(W, H * 0.9, -2 * Math.PI / 3, 0.32, [13, 21], cols));

    var start = performance.now(), last = start, LIFE = 3300, FADE = 900;
    function frame(now) {
      var dt = clamp((now - last) / 16.67, 0, 3);
      last = now;
      var age = now - start;
      ctx.clearRect(0, 0, W, H);
      var fade = age > LIFE - FADE ? clamp((LIFE - age) / FADE, 0, 1) : 1;
      var drag = Math.pow(0.985, dt);
      for (var j = 0; j < pieces.length; j++) {
        var p = pieces[j];
        p.vy += 0.34 * dt;
        p.vx *= drag; p.vy *= drag;
        p.wob += p.wobS * dt;
        p.x += (p.vx + Math.sin(p.wob) * 0.7) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.alpha = fade;
        if (p.y < H + 30) drawPiece(ctx, p);
      }
      if (age < LIFE) requestAnimationFrame(frame);
      else if (cv.parentNode) cv.parentNode.removeChild(cv);
    }
    requestAnimationFrame(frame);
  }
})();
