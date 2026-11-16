/*
 * Sage, the coach character, on a <canvas>.
 *
 * A port of the app's SagePainter (lib/widgets/sage/sage_character.dart) and
 * CoachMarkGeometry (lib/widgets/coach_mark.dart): the same bubble, the same
 * leaf-swept tail, eyes, blush and the gold sparkle at the shoulder. The
 * control points and timings are the app's, so the Sage on the website is the
 * Sage in the app — retune there first, then mirror it here.
 *
 * Usage: <canvas data-sage data-size="96" data-pose="wave" data-follow></canvas>
 * Every such canvas gets an instance at `canvas.__sage`:
 *   sage.set({ pose, talking, stretch, tilt })   sage.lookAt(x, y)   sage.cheer(ms)
 *
 * Under reduced motion there is no loop at all: one still, friendly frame.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var root = document.documentElement;
  var reduce = /(^|\s)reduce(\s|$)/.test(root.className);
  var LOOP_MS = 4000;
  var BODY_SCALE = 0.80;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // 0 → 1 → 0 across the window [a, b] of the loop, 0 outside it.
  function blip(t, a, b) {
    if (t <= a || t >= b) return 0;
    return Math.sin(((t - a) / (b - a)) * Math.PI);
  }

  function rgba(hex, alpha) {
    var h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (h.length !== 6 || isNaN(n)) return 'rgba(122,155,104,' + alpha + ')';
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function readPalette(el) {
    var cs = getComputedStyle(el);
    function v(name, fallback) { return (cs.getPropertyValue(name) || '').trim() || fallback; }
    return {
      primary: v('--primary', '#7A9B68'),
      ink: v('--face-ink', '#FFFFFF'),
      rose: v('--rose', '#B85C5C'),
      gold: v('--gold', '#C4914A')
    };
  }

  // ── Geometry (CoachMarkGeometry) ──
  function bodyPath(ctx, b) {
    var x = 0.06 * b, y = 0.06 * b, w = 0.88 * b, h = 0.64 * b, r = 0.22 * b;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function tailPath(ctx, b) {
    ctx.beginPath();
    ctx.moveTo(0.30 * b, 0.58 * b);
    ctx.quadraticCurveTo(0.24 * b, 0.80 * b, 0.11 * b, 0.92 * b);
    ctx.quadraticCurveTo(0.35 * b, 0.83 * b, 0.55 * b, 0.66 * b);
    ctx.closePath();
  }
  function sparklePath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
    ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
    ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
    ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
    ctx.closePath();
  }

  // ── One frame (SagePainter.paint) ──
  function paint(ctx, s, f, col) {
    var b = s * BODY_SCALE;
    var ox = (s - b) / 2, oy = s * 0.12;

    ctx.clearRect(0, 0, s, s);

    // Halo, so the figure lifts off whatever is behind it.
    var hx = s / 2, hy = oy + b * 0.40;
    var halo = ctx.createRadialGradient(hx, hy, b * 0.18, hx, hy, b * 0.62);
    halo.addColorStop(0, rgba(col.primary, 0.20));
    halo.addColorStop(1, rgba(col.primary, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, s, s);

    // Squash, stretch and lean pivot on the tail tip — the point it stands on.
    var px = ox + b * 0.5, py = oy + b * 0.86;
    var sy = clamp(f.stretch, 0.6, 1.5);
    var sx = 1 / Math.sqrt(sy);
    ctx.save();
    ctx.translate(px, py + f.bob * s);
    ctx.rotate(f.tilt);
    ctx.scale(sx, sy);
    ctx.translate(-px, -py);
    ctx.translate(ox, oy);

    ctx.fillStyle = col.primary;

    // The tail first, swaying about its root, so the body covers the joint.
    var rx0 = 0.42 * b, ry0 = 0.62 * b;
    ctx.save();
    ctx.translate(rx0, ry0);
    ctx.rotate(f.tailSway);
    ctx.translate(-rx0, -ry0);
    tailPath(ctx, b);
    ctx.fill();
    ctx.restore();

    bodyPath(ctx, b);
    ctx.fill();

    face(ctx, b, f, col);
    ctx.restore();

    // The AI sparkle, riding at the shoulder.
    var cx = ox + b * 0.955;
    var cy = oy + b * 0.075 + (f.bob - 0.012 * Math.sin(f.twinkle * Math.PI)) * s;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((f.twinkle - 0.5) * 0.5);
    ctx.globalAlpha = 0.72 + 0.28 * f.twinkle;
    ctx.fillStyle = col.gold;
    sparklePath(ctx, b * (0.085 + 0.045 * f.twinkle));
    ctx.fill();
    ctx.restore();
  }

  function face(ctx, b, f, col) {
    var gx = clamp(f.lookX, -1, 1) * b * 0.050;
    var gy = clamp(f.lookY, -1, 1) * b * 0.038;
    var lineW = Math.max(1.4, b * 0.042);

    ctx.lineCap = 'round';
    ctx.lineWidth = lineW;
    ctx.strokeStyle = col.ink;

    // Blush, once there is room for it to be a colour rather than a smudge.
    if (b >= 34) {
      ctx.fillStyle = rgba(col.rose, 0.26);
      [0.215, 0.785].forEach(function (x) {
        ctx.beginPath();
        ctx.ellipse(x * b + gx * 0.5, 0.475 * b + gy * 0.5, b * 0.065, b * 0.0375, 0, 0, TAU);
        ctx.fill();
      });
    }

    var rx = b * 0.058, ry = b * 0.080;
    [0.355, 0.645].forEach(function (x) {
      var cx = x * b + gx, cy = 0.345 * b + gy;
      if (f.happy > 0.5) {
        // A grin shuts the eyes into arcs.
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.25, ry * 0.85, 0, Math.PI, TAU);
        ctx.stroke();
        return;
      }
      var open = clamp(1 - f.blink, 0, 1);
      if (open < 0.16) {
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.1, cy);
        ctx.lineTo(cx + rx * 1.1, cy);
        ctx.stroke();
        return;
      }
      ctx.fillStyle = col.ink;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry * open, 0, 0, TAU);
      ctx.fill();
      // The catchlight: the dot that turns two ovals into eyes looking at something.
      if (b >= 34 && open > 0.7) {
        ctx.fillStyle = col.primary;
        ctx.beginPath();
        ctx.arc(cx + rx * 0.32 - gx * 0.25, cy - ry * 0.36 - gy * 0.25, rx * 0.30, 0, TAU);
        ctx.fill();
      }
    });

    var mx = 0.5 * b + gx * 0.55, my = 0.515 * b + gy * 0.55;
    if (f.mouth < 0.08) {
      // Closed: a small smile, a little wider when grinning.
      var w = b * (0.15 + 0.05 * f.happy);
      ctx.beginPath();
      ctx.ellipse(mx, my - b * 0.035, w / 2, w * 0.4, 0, Math.PI * 0.14, Math.PI * 0.86);
      ctx.stroke();
    } else {
      ctx.fillStyle = col.ink;
      ctx.beginPath();
      ctx.ellipse(mx, my, b * (0.135 - 0.03 * f.mouth) / 2, b * (0.03 + 0.105 * f.mouth) / 2, 0, 0, TAU);
      ctx.fill();
    }
  }

  // ── Instances ──
  var instances = [];
  var pointer = { x: 0, y: 0, active: false };
  var rafId = 0;

  function Sage(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = parseFloat(canvas.getAttribute('data-size')) || canvas.clientWidth || 96;
    this.pose = canvas.getAttribute('data-pose') || 'idle';
    this.follow = canvas.hasAttribute('data-follow');
    this.talking = false;
    this.stretch = 1;
    this.tilt = 0;
    this.lookX = 0; this.lookY = 0;
    this.targetX = 0; this.targetY = 0;
    // Each Sage runs on its own phase, so two on one page never blink in unison.
    this.phase = instances.length * 0.37;
    this.visible = true;
    this.cheerTimer = 0;
    this.col = readPalette(canvas);
    this.resize();
  }

  Sage.prototype.resize = function (size) {
    if (size) this.size = size;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.style.width = this.size + 'px';
    this.canvas.style.height = this.size + 'px';
    this.canvas.width = Math.round(this.size * dpr);
    this.canvas.height = Math.round(this.size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw(performance.now());
  };

  Sage.prototype.set = function (props) {
    for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) this[k] = props[k];
    if (reduce) this.draw(0);
    return this;
  };

  Sage.prototype.lookAt = function (x, y) {
    this.targetX = clamp(x, -1, 1);
    this.targetY = clamp(y, -1, 1);
    if (reduce) { this.lookX = this.targetX; this.lookY = this.targetY; this.draw(0); }
  };

  /** Cheers for `ms`, then goes back to whatever it was doing. */
  Sage.prototype.cheer = function (ms) {
    var self = this;
    var back = this.pose === 'cheer' ? 'idle' : this.pose;
    clearTimeout(this.cheerTimer);
    this.set({ pose: 'cheer' });
    this.cheerTimer = setTimeout(function () { self.set({ pose: back }); }, ms || 2200);
  };

  Sage.prototype.refreshPalette = function () {
    this.col = readPalette(this.canvas);
    this.draw(performance.now());
  };

  Sage.prototype.draw = function (now) {
    var smiling = this.pose === 'wave' || this.pose === 'cheer';

    if (reduce) {
      paint(this.ctx, this.size, {
        blink: 0, lookX: this.lookX, lookY: this.lookY, mouth: 0,
        happy: smiling ? 1 : 0, tailSway: 0, twinkle: 0.5, stretch: 1,
        tilt: this.pose === 'curious' ? 0.12 : 0, bob: 0
      }, this.col);
      return;
    }

    var t = ((now / LOOP_MS) + this.phase) % 1;

    if (this.follow && pointer.active) {
      var r = this.canvas.getBoundingClientRect();
      this.targetX = clamp((pointer.x - (r.left + r.width / 2)) / 260, -1, 1);
      this.targetY = clamp((pointer.y - (r.top + r.height / 2)) / 260, -1, 1);
    }
    this.lookX += (this.targetX - this.lookX) * 0.12;
    this.lookY += (this.targetY - this.lookY) * 0.12;

    // One single blink and one double, so it never reads as a metronome.
    var blink = Math.max(blip(t, 0.30, 0.335), blip(t, 0.74, 0.77), blip(t, 0.785, 0.815));

    var tilt = this.tilt;
    var bob = Math.sin(t * TAU) * 0.022;
    var stretch = this.stretch * (1 + Math.sin(t * TAU) * 0.014);

    if (this.pose === 'wave') {
      tilt += Math.sin(t * TAU * 4) * 0.17;
    } else if (this.pose === 'cheer') {
      var hop = Math.abs(Math.sin(t * TAU * 3));
      bob = -hop * 0.085;
      stretch *= 1 + hop * 0.07;
      tilt += Math.sin(t * TAU * 3) * 0.10;
    } else if (this.pose === 'curious') {
      tilt += 0.13 + Math.sin(t * TAU) * 0.03;
    }

    // Syllables rather than a steady flap.
    var mouth = this.talking
      ? (0.25 + 0.75 * Math.abs(Math.sin(t * Math.PI * 22))) * (0.65 + 0.35 * Math.abs(Math.sin(t * TAU * 5)))
      : 0;

    paint(this.ctx, this.size, {
      blink: smiling ? 0 : blink,
      lookX: this.lookX, lookY: this.lookY,
      mouth: mouth,
      happy: smiling ? 1 : 0,
      tailSway: Math.sin(t * TAU) * 0.16 + Math.sin(t * TAU * 2) * 0.05,
      twinkle: 0.5 + 0.5 * Math.sin(t * TAU * 2),
      stretch: stretch, tilt: tilt, bob: bob
    }, this.col);
  };

  // ── One loop for every Sage on the page ──
  function tick(now) {
    rafId = 0;
    var any = false;
    for (var i = 0; i < instances.length; i++) {
      if (!instances[i].visible) continue;
      any = true;
      instances[i].draw(now);
    }
    if (any && !document.hidden) rafId = requestAnimationFrame(tick);
  }
  function wake() {
    if (reduce || rafId || document.hidden) return;
    rafId = requestAnimationFrame(tick);
  }

  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var inst = entry.target.__sage;
          if (inst) inst.visible = entry.isIntersecting;
        });
        wake();
      }, { rootMargin: '80px' })
    : null;

  function create(canvas) {
    if (canvas.__sage) return canvas.__sage;
    var inst = new Sage(canvas);
    canvas.__sage = inst;
    instances.push(inst);
    if (io) io.observe(canvas);
    wake();
    return inst;
  }

  document.addEventListener('visibilitychange', wake);
  document.addEventListener('dermaa:theme', function () {
    // Let the new CSS variables land before reading them back.
    requestAnimationFrame(function () {
      instances.forEach(function (inst) { inst.refreshPalette(); });
    });
  });
  window.addEventListener('resize', function () {
    instances.forEach(function (inst) { inst.resize(); });
  });
  window.addEventListener('pointermove', function (ev) {
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    pointer.x = ev.clientX; pointer.y = ev.clientY; pointer.active = true;
  }, { passive: true });
  document.addEventListener('mouseleave', function () { pointer.active = false; });

  window.DermaaSage = { create: create, reduce: reduce };

  var canvases = document.querySelectorAll('canvas[data-sage]');
  for (var i = 0; i < canvases.length; i++) create(canvases[i]);
})();
