/* williamsan.art v1 : Popsan
   Une seule interaction : la lumière.
   - Chaque toile sort du noir depuis la source qu'elle peint (lanterne, lune, fleur, veines d'or).
   - Dans la salle d'Akari, la main tient une seconde lumière : la souris ou le doigt la portent
     jusqu'au visage, et la lanterne peinte s'avive quand la main s'en approche.
   - Chaque toile porte une ombre discrète sur le mur, à l'opposé de la main.

   L'œuvre n'est jamais modifiée : c'est une <img> intacte. Par-dessus, un calque de nuit
   (canevas 2D basse définition) s'efface ; une fois la lumière venue, il disparaît.
   Rien ne se calcule au repos : une image n'est dessinée que si le défilement, la main
   ou une lumière encore en train de s'éteindre l'exigent, et seulement pour ce qui est à l'écran. */
(() => {
  'use strict';

  const html = document.documentElement;
  html.classList.add('js');
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calme) html.classList.add('anime');

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lisse = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const vers = (v, cible, vitesse, dt) => v + (cible - v) * (1 - Math.exp(-vitesse * dt));
  const NUIT = '7,7,6';

  /* ───────────── La main du visiteur ───────────── */
  const main = { x: 0, y: 0, active: false, doigt: false };

  /* ───────────── Un grain fixe, pour que les dégradés sombres ne fassent pas de paliers ───────────── */
  let grain = null;
  function toileGrain() {
    if (grain) return grain;
    grain = document.createElement('canvas');
    grain.width = grain.height = 64;
    const g = grain.getContext('2d');
    const d = g.createImageData(64, 64);
    for (let i = 0; i < d.data.length; i += 4) d.data[i + 3] = (Math.random() * 255) | 0;
    g.putImageData(d, 0, 0);
    return grain;
  }

  /* ───────────── Le calque de nuit ───────────── */
  class Nuit {
    constructor(canvas, { echelle = 0.5, max = 900 } = {}) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.echelle = echelle;
      this.max = max;
      this.s = echelle;
      this.cle = '';
      this.motif = this.ctx.createPattern(toileGrain(), 'repeat');
    }

    taille(w, h) {
      const s = Math.min(this.echelle, this.max / Math.max(w, h, 1));
      const W = Math.max(2, Math.round(w * s));
      const H = Math.max(2, Math.round(h * s));
      if (W !== this.c.width || H !== this.c.height) { this.c.width = W; this.c.height = H; this.cle = ''; }
      this.s = s;
    }

    /* e : ombre 0..1 ; trous [{x, y, r, a}] en px CSS ; masque, masqueA, masqueR {x, y, w, h} en px CSS (sinon tout le calque) */
    dessiner(e) {
      const trous = e.trous || [];
      const mr = e.masqueR;
      const cle = [e.ombre, e.masqueA || 0].concat(...trous.map((t) => [t.x, t.y, t.r, t.a]), mr ? [mr.x, mr.y, mr.w, mr.h] : [])
        .map((v) => (v || 0).toFixed(2)).join('|') + (e.masque ? 'm' : '');
      if (cle === this.cle) return;
      this.cle = cle;

      const { ctx, s } = this;
      const W = this.c.width, H = this.c.height;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);

      if (e.ombre <= 0.004) {
        if (this.c.style.visibility !== 'hidden') this.c.style.visibility = 'hidden';
        return;
      }
      if (this.c.style.visibility === 'hidden') this.c.style.visibility = '';

      ctx.fillStyle = `rgba(${NUIT},${e.ombre})`;
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'destination-out';
      for (const t of trous) {
        if (!(t.r > 0) || !(t.a > 0.004)) continue;
        const x = t.x * s, y = t.y * s, r = t.r * s;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${t.a})`);
        g.addColorStop(0.3, `rgba(0,0,0,${0.95 * t.a})`);
        g.addColorStop(0.55, `rgba(0,0,0,${0.66 * t.a})`);
        g.addColorStop(0.78, `rgba(0,0,0,${0.26 * t.a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      if (e.masque && e.masqueA > 0) {
        ctx.globalAlpha = e.masqueA;
        if (mr) ctx.drawImage(e.masque, mr.x * s, mr.y * s, mr.w * s, mr.h * s);
        else ctx.drawImage(e.masque, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = this.motif;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* ───────────── L'ombre portée : à l'opposé de la main, sinon d'une lumière haute ───────────── */
  function ombrePortee(el, r, force) {
    if (!el) return;
    let lx = innerWidth * 0.5, ly = -innerHeight * 0.45;
    if (main.active && !main.doigt) { lx = main.x; ly = main.y; }
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = cx - lx, dy = cy - ly;
    const n = Math.hypot(dx, dy) || 1;
    const portee = Math.min(n * 0.045, r.width * 0.032);
    dx = (dx / n) * portee; dy = (dy / n) * portee;
    const proche = main.active && !main.doigt ? lisse(r.width * 2.6, r.width * 0.2, n) : 0.55;
    el.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)`;
    el.style.opacity = (force * (0.55 + 0.4 * proche)).toFixed(3);
  }

  /* ───────────── Boucle d'image unique, à la demande ───────────── */
  const scenes = [];
  const actives = new Set();
  let raf = 0;
  let dernier = performance.now();
  const demander = () => { if (!raf) raf = requestAnimationFrame(boucle); };
  function boucle(now) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - dernier) / 1000));
    dernier = now;
    for (const sc of actives) sc.lire();          // toutes les lectures de mise en page d'abord
    let encore = false;
    for (const sc of actives) encore = sc.ecrire(now, dt) || encore;
    for (const sc of actives) if (sc.vu === false && !sc.tient) actives.delete(sc);
    if (encore) demander(); else dernier = performance.now();
  }

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entrees) => {
    for (const en of entrees) {
      const sc = scenes.find((x) => x.el === en.target);
      if (!sc) continue;
      sc.vu = en.isIntersecting;
      // Une salle qui s'allume va au bout de son arrivée, même hors de l'écran : son calque de nuit est fixe.
      if (en.isIntersecting) actives.add(sc); else if (!sc.tient) actives.delete(sc);
    }
    dernier = performance.now();
    demander();
  }, { rootMargin: '20% 0px' }) : null;

  function enregistrer(sc) {
    scenes.push(sc);
    if (io) io.observe(sc.el); else actives.add(sc);
  }

  /* ───────────── La salle d'Akari ─────────────
     mode « defilement » (page Popsan) : la lumière monte avec le défilement de la scène collante ;
     mode « arrivee » (fiche) : la salle s'allume en 1,5 s, une fois la toile décodée. */
  function salle(el) {
    const mode = el.dataset.salle || 'defilement';
    const toile = el.querySelector('.toile');
    const peinture = toile.querySelector('.toile__peinture');
    const img = peinture.querySelector('img');
    const feu = peinture.querySelector('.toile__feu');
    const ombreEl = toile.querySelector('.toile__ombre');
    const canvas = el.querySelector(':scope > canvas.nuit');
    const cartel = el.querySelector('[data-cartel]');
    // La lueur sur le mur : un calque CSS en pleine définition (un dégradé faible dans le canevas ferait des paliers).
    const halo = el.querySelector(':scope > .halo');
    const [SX, SY] = (toile.dataset.source || '0.5,0.5').split(',').map(Number);
    const nuit = new Nuit(canvas, { echelle: 0.5, max: 1000 });
    // Une céramique Kintsugi n'a pas de lanterne : ce sont ses veines d'or qui sortent du noir d'abord.
    let masque = null;
    if (toile.dataset.masque) {
      masque = new Image();
      masque.decoding = 'async';
      masque.onload = () => { nuit.cle = ''; demander(); };
      masque.src = toile.dataset.masque;
    }
    let re = null;
    // L'allumage : une fois la toile décodée, la lanterne s'allume en 0,7 s. C'est le seul mouvement qui ne répond pas à un geste.
    let tAllume = null;
    (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => { tAllume = performance.now(); dernier = tAllume; demander(); });
    setTimeout(() => { if (tAllume === null) { tAllume = performance.now(); demander(); } }, 2500);

    let haut = 0, course = 1;
    let rs = null, ri = null;
    let t0 = null;
    const decal = { x: 0, y: 0, a: 0 };
    const lanterne = { feu: 0, maintien: 0, phase: Math.random() * 9 };

    const mesurer = () => {
      if (mode === 'defilement') {
        haut = el.parentElement.getBoundingClientRect().top + scrollY;
        course = Math.max(1, el.parentElement.offsetHeight - el.offsetHeight);
      }
      if (ombreEl) ombreEl.style.setProperty('--flou', `${Math.round(toile.offsetWidth * 0.05)}px`);
      if (halo) halo.style.width = halo.style.height = `${Math.round(peinture.offsetWidth * 1.34)}px`;
      const c = canvas.getBoundingClientRect();
      nuit.taille(c.width, c.height);
    };


    // Au clavier, le lien du cartel reste atteignable : on amène la lumière jusqu'à lui.
    if (cartel && mode === 'defilement') {
      cartel.addEventListener('focusin', () => {
        const p = clamp((scrollY - haut) / course);
        if (p < 0.8) scrollTo({ top: haut + course * 0.92, behavior: 'instant' });
      });
    }

    const sc = {
      el,
      tient: mode === 'arrivee',
      mesurer,
      lire() {
        rs = canvas.getBoundingClientRect();
        ri = peinture.getBoundingClientRect();
        re = el.getBoundingClientRect();
      },
      ecrire(now, dt) {
        const allume = tAllume === null ? 0 : lisse(0, 700, now - tAllume);
        if (mode === 'arrivee' && t0 === null && tAllume !== null) t0 = tAllume + 400;   // la salle s’allume en 1,5 s, juste après la lanterne
        let p;
        if (mode === 'defilement') p = clamp((scrollY - haut) / course);
        else p = t0 === null ? 0 : clamp((now - t0) / 1500);
        const W = ri.width;
        if (!W) return false;
        const diag = Math.hypot(rs.width, rs.height);

        // La source peinte, en coordonnées du calque
        const lx = ri.left - rs.left + SX * W;
        const ly = ri.top - rs.top + SY * ri.height;

        // La main : une seconde lumière, tirée de la lanterne jusqu'à 70 % de la toile, suivi 0,8
        const suivi = mode === 'defilement' ? 1 - lisse(0.5, 0.86, p) : 0;
        let tx = 0, ty = 0;
        const tenue = main.active && suivi > 0.01;
        if (tenue) {
          tx = (main.x - (ri.left + SX * W)) * 0.8;
          ty = (main.y - (ri.top + SY * ri.height)) * 0.8;
          const n = Math.hypot(tx, ty), lim = W * 0.7;
          if (n > lim) { tx *= lim / n; ty *= lim / n; }
        }
        decal.x = vers(decal.x, tx, 10, dt);
        decal.y = vers(decal.y, ty, 10, dt);
        decal.a = vers(decal.a, tenue ? suivi : 0, tenue ? 6 : 2.5, dt);
        const bouge = Math.abs(tx - decal.x) > 0.3 || Math.abs(ty - decal.y) > 0.3 || Math.abs((tenue ? suivi : 0) - decal.a) > 0.004;

        // La lanterne s'avive quand la main s'en approche ; elle reste vive 4,5 s.
        let proche = 0;
        if (main.active) proche = lisse(W * 0.34, W * 0.08, Math.hypot(main.x - rs.left - lx, main.y - rs.top - ly));
        if (proche > 0.72) lanterne.maintien = 4.5;
        let cible = proche;
        if (lanterne.maintien > 0) { lanterne.maintien -= dt; cible = Math.max(cible, 1); }
        lanterne.feu = calme ? cible : vers(lanterne.feu, cible, cible > lanterne.feu ? 3.2 : 0.55, dt);
        if (lanterne.feu < 0.002 && cible === 0) lanterne.feu = 0;
        const vacille = lanterne.feu > 0.01
          ? 1 + 0.06 * Math.sin(now * 0.0071 + lanterne.phase) * Math.sin(now * 0.0029 + lanterne.phase * 2) + 0.035 * Math.sin(now * 0.017 + lanterne.phase)
          : 1;
        const vif = lanterne.feu * vacille;

        if (masque && mode === 'arrivee') {
          // Les veines d'abord, puis le carreau entier ; un peu plus lent que la lanterne (2,2 s).
          const q = t0 === null ? 0 : clamp((now - t0) / 2200);
          const pret = masque.complete && masque.naturalWidth > 0;
          nuit.dessiner({
            ombre: 1 - lisse(0.42, 0.95, q),
            masque: pret ? masque : null,
            masqueA: lisse(0.02, 0.36, q) * allume,
            masqueR: { x: ri.left - rs.left, y: ri.top - rs.top, w: W, h: ri.height },
          });
          ombrePortee(ombreEl, ri, lisse(0.5, 1, q));
          const suite = t0 === null || q < 1 || !pret;
          if (!suite) this.tient = false;
          return suite;
        }

        // L'aube : le cercle de la lanterne grandit dès le premier cran, puis la pièce entière s'éclaire.
        const t = clamp(p / 0.62);
        const montee = 1 - Math.pow(1 - t, 2.2);
        const rL = mix(W * 0.3, diag * 1.25, montee) * (1 + 0.12 * vif);
        const ombre = 1 - lisse(0.26, 0.74, p);
        nuit.dessiner({
          ombre,
          trous: [
            { x: lx, y: ly, r: rL * (0.55 + 0.45 * allume), a: allume },
            { x: lx + decal.x, y: ly + decal.y, r: W * 0.36, a: decal.a * allume },
          ],
        });
        if (halo) {
          // Taille fixée à la mesure (rayon 0,67 de la toile) ; seul l'éclat la fait varier, par une échelle.
          const R = W * 0.67;
          const a = allume * (0.75 * (1 - lisse(0.1, 0.55, p)) + 0.9 * vif) * (1 - 0.5 * lisse(0.6, 1, p));
          halo.style.transform = `translate3d(${(ri.left - re.left + SX * W - R).toFixed(1)}px,${(ri.top - re.top + SY * ri.height - R).toFixed(1)}px,0) scale(${(0.85 + 0.15 * vif).toFixed(3)})`;
          halo.style.opacity = Math.min(1, a).toFixed(3);
        }

        if (feu) feu.style.opacity = (0.34 * vif).toFixed(3);

        const jour = lisse(0.32, 0.86, p);
        ombrePortee(ombreEl, ri, jour);

        if (cartel) {
          const o = mode === 'defilement' ? lisse(0.5, 0.66, p) : 1;
          cartel.style.opacity = o.toFixed(3);
          cartel.classList.toggle('est-visible', o > 0.5);
        }

        const enArrivee = mode === 'arrivee' && (t0 === null || p < 1);
        if (!enArrivee) this.tient = false;
        return bouge || allume < 1 || enArrivee || lanterne.feu > 0 || lanterne.maintien > 0;
      },
    };
    enregistrer(sc);
    return sc;
  }

  /* ───────────── L'accrochage : chaque œuvre s'éclaire depuis sa source en entrant dans l'écran ───────────── */
  function oeuvre(el) {
    const toile = el.querySelector('.toile');
    const peinture = toile.querySelector('.toile__peinture');
    const canvas = peinture.querySelector('.nuit');
    const ombreEl = toile.querySelector('.toile__ombre');
    const [sx, sy] = (toile.dataset.source || '0.5,0.5').split(',').map(Number);
    const urlMasque = toile.dataset.masque;
    const nuit = new Nuit(canvas, { echelle: urlMasque ? 0.75 : 0.5, max: urlMasque ? 640 : 420 });

    let masque = null;
    if (urlMasque) {
      masque = new Image();
      masque.decoding = 'async';
      masque.onload = () => { nuit.cle = ''; demander(); };
      masque.src = urlMasque;
    }

    let r = null;
    const sc = {
      el,
      mesurer() {
        nuit.taille(peinture.clientWidth, peinture.clientHeight);
        if (ombreEl) ombreEl.style.setProperty('--flou', `${Math.round(toile.offsetWidth * 0.05)}px`);
      },
      lire() { r = peinture.getBoundingClientRect(); },
      ecrire() {
        if (!r.width) return false;
        const vh = innerHeight;
        // 0 quand le centre de l'œuvre arrive au bas de l'écran, 1 quand il passe aux trois quarts de sa hauteur.
        const q = clamp((vh * 1.02 - (r.top + r.height / 2)) / (vh * 0.3));
        if (masque) {
          // La fissure d'abord : seules les veines d'or sortent du noir, puis le carreau entier.
          nuit.dessiner({
            ombre: 1 - lisse(0.42, 0.95, q),
            masque: masque.complete && masque.naturalWidth ? masque : null,
            masqueA: lisse(0.02, 0.36, q),
          });
        } else {
          const w = r.width, h = r.height;
          const montee = lisse(0, 0.85, q);
          nuit.dessiner({
            ombre: 1 - lisse(0.3, 0.92, q),
            trous: [{ x: sx * w, y: sy * h, r: mix(w * 0.16, Math.hypot(w, h) * 1.15, montee * montee), a: 1 }],
          });
        }
        ombrePortee(ombreEl, r, lisse(0.55, 1, q));
        return false;
      },
    };
    enregistrer(sc);
    return sc;
  }

  /* ───────────── La loupe : l'image de 2000 px, pincement, molette, + − 0, flèches, Échap ───────────── */
  function loupe() {
    const dlg = document.querySelector('.loupe');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    const vue = dlg.querySelector('.loupe__vue');
    const img = vue.querySelector('img');
    const legende = dlg.querySelector('.loupe__legende');
    const z = { s: 1, x: 0, y: 0, base: 1, w: 1, h: 1, max: 6 };
    const doigts = new Map();
    let glisse = null, pince = null, bouge = false, declencheur = null;

    function appliquer() {
      const W = z.w * z.base * z.s, H = z.h * z.base * z.s;
      // Agrandie, l'œuvre peut glisser un peu au-delà du bord : un coin (la signature) sort de sous les commandes.
      const mx = W > vue.clientWidth ? (W - vue.clientWidth) / 2 + 24 : 0;
      const my = H > vue.clientHeight ? (H - vue.clientHeight) / 2 + 88 : 0;
      z.x = clamp(z.x, -mx, mx);
      z.y = clamp(z.y, -my, my);
      img.style.width = `${z.w * z.base}px`;
      img.style.transform = `translate(${z.x - W / 2}px,${z.y - H / 2}px) scale(${z.s})`;
    }
    function zoomer(s, cx, cy) {
      // garde sous le point (cx, cy) le même endroit de l'œuvre
      const ns = clamp(s, 1, z.max);
      const ox = cx - vue.clientWidth / 2, oy = cy - vue.clientHeight / 2;
      z.x = ox - ((ox - z.x) * ns) / z.s;
      z.y = oy - ((oy - z.y) * ns) / z.s;
      z.s = ns;
      appliquer();
    }
    function cadrer(fx, fy, s) {
      // L'œuvre entière tient entre la légende et les commandes, sans passer dessous.
      const marge = vue.clientHeight > 500 ? 152 : 112;
      z.base = Math.min((vue.clientWidth - 32) / z.w, (vue.clientHeight - marge) / z.h);
      z.max = clamp((z.w / (z.w * z.base)) * 2.2, 1.6, 6);
      z.s = clamp(s || 1, 1, z.max);
      const W = z.w * z.base * z.s, H = z.h * z.base * z.s;
      z.x = (0.5 - (Number.isFinite(fx) ? fx : 0.5)) * W;
      z.y = (0.5 - (Number.isFinite(fy) ? fy : 0.5)) * H;
      appliquer();
    }
    function ouvrir(lien) {
      declencheur = lien;
      const src = lien.getAttribute('href');
      const apercu = lien.dataset.apercu;
      z.w = Number(lien.dataset.l) || 2000;
      z.h = Number(lien.dataset.h) || 2000;
      legende.textContent = lien.dataset.nom || '';
      img.alt = lien.dataset.nom || '';
      // L'aperçu déjà chargé s'affiche tout de suite ; la grande image le remplace dès qu'elle arrive.
      if (img.getAttribute('src') !== src) {
        if (apercu) img.src = apercu;
        const grande = new Image();
        grande.decoding = 'async';
        grande.onload = () => { if (declencheur === lien) img.src = src; };
        grande.src = src;
      }
      dlg.showModal();
      cadrer(parseFloat(lien.dataset.fx), parseFloat(lien.dataset.fy), parseFloat(lien.dataset.z) || 1);
      vue.focus({ preventScroll: true });
    }

    document.querySelectorAll('a[data-loupe]').forEach((a) => {
      a.addEventListener('click', (e) => { e.preventDefault(); ouvrir(a); });
    });
    // « Agrandir l'œuvre » : un bouton qui ouvre la loupe de la toile qu'il désigne.
    document.querySelectorAll('button[data-pour]').forEach((b) => {
      const a = document.getElementById(b.dataset.pour);
      if (!a) return;
      b.hidden = false;
      b.addEventListener('click', () => ouvrir(a));
    });
    dlg.querySelector('[data-fermer]').addEventListener('click', () => dlg.close());
    dlg.querySelector('[data-plus]').addEventListener('click', () => zoomer(z.s * 1.6, vue.clientWidth / 2, vue.clientHeight / 2));
    dlg.querySelector('[data-moins]').addEventListener('click', () => zoomer(z.s / 1.6, vue.clientWidth / 2, vue.clientHeight / 2));
    dlg.addEventListener('close', () => { if (declencheur) declencheur.focus({ preventScroll: true }); });
    dlg.addEventListener('keydown', (e) => {
      const pas = 60;
      if (e.key === '+' || e.key === '=') zoomer(z.s * 1.4, vue.clientWidth / 2, vue.clientHeight / 2);
      else if (e.key === '-' || e.key === '_') zoomer(z.s / 1.4, vue.clientWidth / 2, vue.clientHeight / 2);
      else if (e.key === '0') { z.s = 1; z.x = z.y = 0; appliquer(); }
      else if (e.key === 'ArrowLeft') { z.x += pas; appliquer(); }
      else if (e.key === 'ArrowRight') { z.x -= pas; appliquer(); }
      else if (e.key === 'ArrowUp') { z.y += pas; appliquer(); }
      else if (e.key === 'ArrowDown') { z.y -= pas; appliquer(); }
      else return;
      e.preventDefault();
    });
    vue.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rv = vue.getBoundingClientRect();
      zoomer(z.s * Math.exp(-e.deltaY * 0.0022), e.clientX - rv.left, e.clientY - rv.top);
    }, { passive: false });
    vue.addEventListener('pointerdown', (e) => {
      vue.setPointerCapture(e.pointerId);
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      bouge = false;
      if (doigts.size === 1) glisse = { x: e.clientX, y: e.clientY, zx: z.x, zy: z.y };
      if (doigts.size === 2) {
        const a = Array.from(doigts.values());
        pince = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), s: z.s };
        glisse = null;
      }
      vue.classList.add('saisie');
    });
    vue.addEventListener('pointermove', (e) => {
      if (!doigts.has(e.pointerId)) return;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pince && doigts.size === 2) {
        const a = Array.from(doigts.values()), rv = vue.getBoundingClientRect();
        const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        zoomer((pince.s * d) / pince.d, (a[0].x + a[1].x) / 2 - rv.left, (a[0].y + a[1].y) / 2 - rv.top);
        bouge = true;
      } else if (glisse) {
        const mx = e.clientX - glisse.x, my = e.clientY - glisse.y;
        if (Math.abs(mx) + Math.abs(my) > 4) bouge = true;
        z.x = glisse.zx + mx; z.y = glisse.zy + my; appliquer();
      }
    });
    const lacher = (e) => {
      const simple = doigts.size === 1 && !bouge;
      doigts.delete(e.pointerId);
      if (doigts.size < 2) pince = null;
      if (doigts.size === 0) {
        vue.classList.remove('saisie');
        if (simple && e.type === 'pointerup') {
          // Un appui sans glisser : agrandit à cet endroit, ou revient à l'œuvre entière.
          const rv = vue.getBoundingClientRect();
          zoomer(z.s > 1.4 ? 1 : Math.min(2.6, z.max), e.clientX - rv.left, e.clientY - rv.top);
        }
        glisse = null;
      }
    };
    vue.addEventListener('pointerup', lacher);
    vue.addEventListener('pointercancel', lacher);
    addEventListener('resize', () => { if (dlg.open && z.w > 1) cadrer(0.5, 0.5, 1); });
  }

  /* ───────────── Écrire à William San : la flamme en boucle lente, seulement quand on la voit ─────────────
     Mouvement réduit, économie de données ou vidéo absente : l'image fixe (fond CSS) reste seule. */
  function fonds() {
    const eco = navigator.connection && navigator.connection.saveData;
    document.querySelectorAll('video[data-src]').forEach((v) => {
      if (calme || eco || !('IntersectionObserver' in window)) return;
      v.muted = true;
      v.addEventListener('playing', () => v.classList.add('joue'));
      v.addEventListener('error', () => v.classList.remove('joue'), true);
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting) {
          if (!v.getAttribute('src')) { v.src = v.dataset.src; v.load(); }
          v.playbackRate = Number(v.dataset.vitesse) || 1;
          const pr = v.play();
          if (pr && pr.catch) pr.catch(() => {});
        } else if (!v.paused) v.pause();
      }, { rootMargin: '30% 0px' }).observe(v);
    });
  }

  /* ───────────── La presse : la photo sort du noir une fois, quand elle entre à l'écran ─────────────
     L'observateur se retire aussitôt ; rien ne tourne ensuite. */
  function apparitions() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        const el = e.target;
        // Premier rappel : à l'écran, la photo reste telle quelle ; hors de l'écran, elle attend.
        if (e.isIntersecting && (e.intersectionRatio >= 0.15 || !el.classList.contains('attend'))) {
          el.classList.add('est-vu');
          io.unobserve(el);
        } else if (!e.isIntersecting) el.classList.add('attend');
      }
    }, { threshold: 0.15 });
    document.querySelectorAll('[data-apparait]').forEach((x) => io.observe(x));
  }

  /* ───────────── Mise en route ───────────── */
  function demarrer() {
    loupe();
    fonds();
    if (calme) return; // version calme : la page reste telle que le HTML la décrit

    apparitions();

    document.querySelectorAll('[data-salle]').forEach(salle);
    document.querySelectorAll('[data-oeuvre]').forEach(oeuvre);

    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      main.x = e.clientX; main.y = e.clientY; main.active = true; main.doigt = false;
      demander();
    }, { passive: true });
    document.addEventListener('mouseleave', () => { main.active = false; demander(); });
    // Au doigt, la lumière suit le doigt posé sur la salle (le défilement reste natif).
    document.querySelectorAll('[data-salle]').forEach((el) => {
      const viser = (t) => { main.x = t.clientX; main.y = t.clientY; main.active = true; main.doigt = true; demander(); };
      el.addEventListener('touchstart', (e) => viser(e.touches[0]), { passive: true });
      el.addEventListener('touchmove', (e) => viser(e.touches[0]), { passive: true });
      el.addEventListener('touchend', () => { main.active = false; demander(); }, { passive: true });
    });

    const remesurer = () => { scenes.forEach((s) => s.mesurer()); demander(); };
    addEventListener('scroll', demander, { passive: true });
    let attente = 0;
    addEventListener('resize', () => { clearTimeout(attente); attente = setTimeout(remesurer, 120); demander(); });
    addEventListener('load', remesurer);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remesurer);
    remesurer();
  }

  // Si le visiteur change d'avis sur le mouvement, on recharge dans le bon mode.
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => location.reload());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
