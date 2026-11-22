# Dermaa promo site

Static marketing site for the Dermaa skincare app. Hosted on GitHub Pages.

## Structure

No build step and no libraries: plain HTML, CSS and JavaScript. Push to `main` = deploy.

- `styles.css` — design tokens for the light and dark themes (mirroring the app's `DermaaColors`) and the chrome every page shares.
- `assets/home.css`, `assets/home.js` — the homepage only: phone mockups, the scroll tour, the three try-it demos.
- `assets/sage.js` — Sage on a canvas, ported from the app's `SagePainter`. Retune the app first, then mirror it here.
- `assets/site.js` — theme toggle, mobile menu, scroll reveal (all pages).
- `assets/track.js` — first-party analytics and the launch sign-up form. The homepage relies on its contract: `data-track` labels, `section[id]`, `<details>` FAQ and `form[data-lead-form]`.

Each page's `<head>` carries the same small inline script that sets the theme before first paint. The theme choice is stored in the browser as `dermaa_theme`, which `privacy.html#website` describes; change one, change the other.

## Preview locally

    python -m http.server 8124

Use port 8124, not 8123: 8123 is an allowed analytics origin, so previewing there writes test visits into the CRM. Add `?motion=off` to any URL to see the reduced-motion version.

## Real screenshots

The phones on the homepage are HTML mockups. To add real screenshots, put PNGs in `assets/shots/` and uncomment the `.real-shots` block in `index.html` (search for "Real screenshots").

## Hosting

Moving from GitHub Pages to Cloudflare Pages (so the repo can be private on the free plan). Cloudflare Pages serves `privacy.html` at `/privacy` and redirects the `.html` form there, so canonical URLs and the sitemap use the extensionless form. GitHub Pages answers at both, so this works on either host. `track.js` reports every page by its `.html` name so analytics history stays continuous.

## Launch-offer page (`/join`)

`join.html` is the campaign page linked from social posts: Yes/No (No runs away), email, celebration. It is `noindex` and kept out of the sitemap. Sign-ups go through the normal launch list; they are the `site_leads` rows with `signup_path = '/join.html'` (so the "first 10" are the earliest of those). Tag links per platform, e.g. `https://dermaa.app/join?utm_source=instagram&utm_medium=social&utm_campaign=launch_offer`.

The preview image `assets/og-join.png` is generated: `python tools/make_og_join.py --fonts D:/flutterconfig/dermaa/dermaa/assets/fonts`. The offer's wording appears in `join.html`, the preview image and `privacy.html#website` — change all three together.
