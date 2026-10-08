/* williamsan.art — Medsan v3, la copie de l'accueil de med-san.art.
 *
 * 1. Les kanji montent et pâlissent au défilement (FloatingKanji).
 * 2. Le titre MEDSAN change d'œuvre toutes les 4 s, en fondu d'1 s ; seulement
 *    tant qu'il est à l'écran et l'onglet visible ; jamais en mouvement réduit
 *    (les points restent, au doigt et au clavier).
 * 3. Les cartes des tirages se révèlent quand elles approchent.
 * 4. Le mur des originaux : cartel révélé, toile qui monte un peu moins vite.
 * 5. Un tirage ouvre sa fiche : format, caisse américaine, prix qui suit, et
 *    « Commander » ouvre la fiche med-san.art avec ces choix
 *    (?format=40x40&caisse=1). Sans JavaScript, la carte mène à med-san.art.
 * Rien ne tourne au repos hors du titre visible : tout le reste répond au
 * défilement ou à un geste.
 */
(() => {
  'use strict';

  // Le dossier de ce script (…/medsan/) : les images s'y trouvent, que la page soit
  // la française ou sa traduction sous /en/medsan/.
  const ICI = document.currentScript ? new URL('./', document.currentScript.src).href : '';
  const EN = document.documentElement.lang === 'en';

  const reduit = matchMedia('(prefers-reduced-motion: reduce)');
  const large = matchMedia('(min-width: 48rem)');

  /* ——— 1. Les kanji ——— */
  const kanji = [...document.querySelectorAll('[data-kanji] span')];
  if (kanji.length) {
    let attente = false;
    const poser = () => {
      attente = false;
      const y = reduit.matches ? 0 : window.scrollY;
      const opacite = Math.max(0.03, 0.08 - y * 0.00005);
      for (const k of kanji) {
        const v = +k.dataset.vitesse;
        k.style.transform = `translate3d(0, ${(y * v).toFixed(1)}px, 0) rotate(${k.dataset.rot}deg)`;
        k.style.opacity = opacite;
      }
    };
    addEventListener('scroll', () => {
      if (reduit.matches || attente) return;
      attente = true;
      requestAnimationFrame(poser);
    }, { passive: true });
    reduit.addEventListener('change', poser);
    poser();
  }

  /* ——— 2. Le titre qui change d'œuvre ——— */
  const heros = document.querySelector('[data-heros]');
  if (heros) {
    const n = +heros.dataset.images;
    const a = heros.querySelector('[data-calque="a"]');
    const b = heros.querySelector('[data-calque="b"]');
    const points = [...heros.querySelectorAll('[data-point]')];
    const fond = (i) => {
      const t = large.matches ? 1600 : 800;
      const base = `${ICI}images/hero/titre-${i + 1}-${t}`;
      return `image-set(url("${base}.webp") type("image/webp"), url("${base}.jpg") type("image/jpeg"))`;
    };
    const precharge = (i) => {
      const img = new Image();
      img.src = `${ICI}images/hero/titre-${i + 1}-${large.matches ? 1600 : 800}.webp`;
      return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    };

    let courant = 0, minuteur = 0, fondu = 0, visible = true, jeton = 0;

    const marquer = (i) => points.forEach((p, k) => p.setAttribute('aria-current', k === i ? 'true' : 'false'));

    async function montrer(i) {
      if (i === courant) return;
      const moi = ++jeton;
      await precharge(i);
      if (moi !== jeton) return;
      clearTimeout(fondu);
      courant = i;
      marquer(i);
      if (reduit.matches) {
        a.style.backgroundImage = fond(i);
        return;
      }
      b.style.backgroundImage = fond(i);
      b.classList.add('est-visible');
      fondu = setTimeout(() => {
        a.style.backgroundImage = fond(i);
        b.classList.remove('est-visible');
      }, 1000);
    }

    function programmer() {
      clearTimeout(minuteur);
      if (reduit.matches || !visible || document.hidden) return;
      minuteur = setTimeout(() => { montrer((courant + 1) % n).then(programmer); }, 4000);
    }

    points.forEach((p, i) => p.addEventListener('click', () => { montrer(i); programmer(); }));
    new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; programmer(); }).observe(heros);
    document.addEventListener('visibilitychange', programmer);
    reduit.addEventListener('change', programmer);
    large.addEventListener('change', () => { a.style.backgroundImage = fond(courant); });
    // la suivante se charge pendant que la première s'affiche
    if (!reduit.matches) addEventListener('load', () => precharge(1), { once: true });
  }

  /* ——— 3. Les cartes des tirages ——— */
  const cartes = document.querySelectorAll('[data-revele]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const carte = e.target;
        const img = carte.querySelector('img');
        const voir = () => carte.classList.add('est-vue');
        if (!img || img.complete) { voir(); continue; }
        img.loading = 'eager';
        img.addEventListener('load', voir, { once: true });
        img.addEventListener('error', voir, { once: true });
        setTimeout(voir, 2500);
      }
    }, { rootMargin: '400px 0px' });
    cartes.forEach((c) => io.observe(c));
  } else {
    cartes.forEach((c) => c.classList.add('est-vue'));
  }

  /* ——— 3 bis. Le peintre à l'atelier : il apparaît une fois, quand il entre à l'écran ——— */
  const peintres = document.querySelectorAll('[data-apparait]');
  if (peintres.length && 'IntersectionObserver' in window && !reduit.matches) {
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        const el = e.target;
        // Premier rappel : à l'écran, la photo reste telle quelle ; hors de l'écran, elle attend.
        if (e.isIntersecting && (e.intersectionRatio >= 0.15 || !el.classList.contains('attend'))) {
          el.classList.add('est-vue');
          io.unobserve(el);
        } else if (!e.isIntersecting) el.classList.add('attend');
      }
    }, { threshold: 0.15 });
    peintres.forEach((x) => io.observe(x));
  }

  /* ——— 4. Le mur des originaux ——— */
  const murs = [...document.querySelectorAll('[data-mur]')];
  if (murs.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        const h = e.rootBounds ? e.rootBounds.height : innerHeight;
        if (e.intersectionRatio >= 0.34 || e.intersectionRect.height >= h * 0.34) {
          e.target.classList.add('est-vue');
          io.unobserve(e.target);
        }
      }
    }, { threshold: [0.1, 0.2, 0.34, 0.5, 0.75, 1] });
    murs.forEach((m) => io.observe(m));

    const derives = murs.map((m) => m.querySelector('[data-derive]'));
    let attente = false;
    const deriver = () => {
      attente = false;
      const vh = innerHeight;
      murs.forEach((m, i) => {
        const d = derives[i];
        if (reduit.matches) { d.style.transform = ''; return; }
        const r = m.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const p = Math.min(1, Math.max(-1, (vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2)));
        d.style.transform = `translate3d(0, ${(p * 16).toFixed(1)}px, 0)`;
      });
    };
    addEventListener('scroll', () => {
      if (reduit.matches || attente) return;
      attente = true;
      requestAnimationFrame(deriver);
    }, { passive: true });
    reduit.addEventListener('change', deriver);
    deriver();
  } else {
    murs.forEach((m) => m.classList.add('est-vue'));
  }

  /* ——— 5. La fiche d'un tirage ——— */
  const dlg = document.querySelector('[data-fiche]');
  const source = document.getElementById('boutique-donnees');
  if (!dlg || !source || typeof dlg.showModal !== 'function') return;

  const { fiche, caisse, tirages } = JSON.parse(source.textContent);
  const $ = (s) => dlg.querySelector(s);
  const el = {
    cadre: $('[data-cadre]'), toile: $('[data-toile]'), img: $('[data-img]'),
    mention: $('[data-mention]'), titre: $('[data-titre]'), formats: $('[data-formats]'),
    finition: $('[data-finition]'), note: $('[data-note-caisse]'),
    prix: $('[data-prix]'), detail: $('[data-detail]'), commander: $('[data-commander]'),
    prixBouton: $('[data-prix-bouton]'),
    toileSeule: $('input[name="finition"][value="toile"]'), enCaisse: $('input[name="finition"][value="caisse"]'),
  };

  const NBSP = ' ', NNBSP = ' ';
  // « 2 600 € » en français, « €2,600 » en anglais (comme med-san.art).
  const euros = (c) => (EN
    ? `€${Math.round(c / 100).toLocaleString('en-GB')}`
    : `${Math.round(c / 100).toLocaleString('fr-FR').replace(/\s/g, NNBSP)}${NBSP}€`);
  const T = EN ? {
    dont: 'including the floater frame', limite: (n) => `An edition of ${n}, and no more`,
    commander: (titre, format, caisse, prix) => `Order ${titre}, ${format}${caisse ? ', in a black floater frame' : ''}, ${prix}, on med-san.art (new tab)`,
    epuisee: 'Edition sold out', limitee: 'Limited edition', epuise: ' · sold out',
  } : {
    dont: 'dont caisse américaine', limite: (n) => `Limité à ${n} exemplaires`,
    commander: (titre, format, caisse, prix) => `Commander ${titre}, ${format}${caisse ? ', en caisse américaine noire' : ''}, ${prix}, sur med-san.art (nouvel onglet)`,
    epuisee: 'Édition épuisée', limitee: 'Édition limitée', epuise: ' · épuisé',
  };
  const cm = (f) => f.replace('x', `${NBSP}×${NBSP}`) + `${NBSP}cm`;
  const ratio = (f) => { const [w, h] = f.split('x').map(Number); return w / h; };

  let courant = -1;

  const formatChoisi = () => { const r = el.formats.querySelector('input:checked'); return r ? r.value : null; };

  function mettreAJour() {
    const t = tirages[courant];
    const f = formatChoisi();
    const v = t.variantes.find((x) => x.format === f) || t.variantes[0];
    const eligible = caisse.formats.includes(v.format);
    el.finition.hidden = !eligible;
    el.note.hidden = eligible;
    if (!eligible) el.toileSeule.checked = true;
    const encadree = eligible && el.enCaisse.checked;

    const r = ratio(v.format);
    el.toile.style.aspectRatio = String(r);
    el.cadre.classList.toggle('est-portrait', r < 1);
    el.cadre.classList.toggle('est-encadree', encadree);
    dlg.querySelectorAll('.vignette__toile, .vignette__caisse').forEach((s) => s.style.setProperty('--r', r));

    const total = v.prix + (encadree ? caisse.prix : 0);
    el.prix.textContent = euros(total);
    el.prixBouton.textContent = euros(total);
    el.detail.textContent = encadree
      ? `${cm(v.format)} · ${T.dont} ${euros(caisse.prix)}`
      : `${cm(v.format)} · ${T.limite(t.edition)}`;

    const epuise = v.stock <= 0;
    const url = new URL(fiche + t.id);
    url.searchParams.set('format', v.format);
    if (encadree) url.searchParams.set('caisse', '1');
    el.commander.href = url.href;
    el.commander.setAttribute('aria-label', T.commander(t.titre, cm(v.format), encadree, euros(total)));
    el.commander.toggleAttribute('aria-disabled', epuise);
    el.mention.textContent = t.variantes.every((x) => x.stock <= 0) ? T.epuisee : T.limitee;
  }

  function charger(i) {
    courant = (i + tirages.length) % tirages.length;
    const t = tirages[courant];
    el.titre.textContent = t.titre;
    const carte = document.querySelector(`[data-tirage="${courant}"] img`);
    el.img.alt = carte ? carte.alt : t.titre;
    el.img.src = `${ICI}images/tirages/${t.slug}-1200.webp`;
    el.img.onerror = () => { el.img.onerror = null; el.img.src = `${ICI}images/tirages/${t.slug}-1200.jpg`; };
    const petite = `url("${ICI}images/tirages/${t.slug}-600.webp")`;
    dlg.querySelectorAll('[data-vignette]').forEach((s) => { s.style.backgroundImage = petite; });

    el.formats.textContent = '';
    t.variantes.forEach((v, k) => {
      const lab = document.createElement('label');
      lab.className = 'onglet';
      const inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = 'format';
      inp.value = v.format;
      inp.checked = k === 0;
      inp.disabled = v.stock <= 0;
      inp.addEventListener('change', mettreAJour);
      const span = document.createElement('span');
      span.textContent = cm(v.format) + (v.stock <= 0 ? T.epuise : '');
      lab.append(inp, span);
      el.formats.append(lab);
    });
    el.toileSeule.checked = true;
    mettreAJour();
  }

  [el.toileSeule, el.enCaisse].forEach((r) => r.addEventListener('change', mettreAJour));
  $('[data-panneau]').addEventListener('submit', (e) => e.preventDefault());
  $('[data-fermer]').addEventListener('click', () => dlg.close());
  $('[data-precedent]').addEventListener('click', () => charger(courant - 1));
  $('[data-suivant]').addEventListener('click', () => charger(courant + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); charger(courant - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); charger(courant + 1); }
  });
  el.commander.addEventListener('click', (e) => { if (el.commander.hasAttribute('aria-disabled')) e.preventDefault(); });

  document.querySelectorAll('[data-tirage]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      charger(+a.dataset.tirage);
      dlg.showModal();
      dlg.scrollTop = 0;
      $('[data-fermer]').focus();
    });
  });
})();
