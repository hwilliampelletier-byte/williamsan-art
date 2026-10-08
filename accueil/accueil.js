/* williamsan.art, accueil.
   Trois choses seulement : les kanji en fond, qui suivent le défilement, la
   visionneuse des œuvres citées, et la vidéo d'ambiance de la section
   « Écrire », qui ne joue que lorsqu'elle est à l'écran. L'arrivée et les
   fenêtres sont en CSS : rien ne tourne au repos. */
(() => {
  'use strict';

  // La racine du site, là où vit ce script (…/accueil/accueil.js) : les images de la
  // visionneuse s'y trouvent, que la page soit l'accueil français ou /en/.
  const RACINE = document.currentScript ? new URL('../', document.currentScript.src).href : '';
  const EN = document.documentElement.lang === 'en';

  /* ─────────────── Les kanji en fond ───────────────
     Le procédé de med-san.art : ils glissent moins vite que la page et
     pâlissent. On ne pose qu'une valeur, --defil, une fois par image et
     seulement pendant le défilement ; le CSS fait le reste. */
  const kanji = document.querySelector('[data-kanji]');
  if (kanji) {
    let attente = false;
    const poser = () => {
      attente = false;
      kanji.style.setProperty('--defil', String(Math.round(window.scrollY)));
    };
    window.addEventListener('scroll', () => {
      if (!attente) { attente = true; requestAnimationFrame(poser); }
    }, { passive: true });
    poser();
  }

  /* ─────────────── La vidéo d'ambiance ─────────────── */
  const video = document.querySelector('[data-ambiance]');
  const calme = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Écran en hauteur (téléphone) : la version verticale de la vidéo, recadrée pour lui.
  if (video && video.dataset.srcPortrait && window.matchMedia('(max-aspect-ratio: 4/5)').matches) {
    const source = video.querySelector('source');
    if (source) source.src = video.dataset.srcPortrait;
    if (video.dataset.posterPortrait) video.poster = video.dataset.posterPortrait;
  }
  if (video && 'IntersectionObserver' in window) {
    let visible = false;
    const jouer = () => {
      if (!visible || calme.matches || document.hidden) { video.pause(); return; }
      if (video.preload !== 'auto') { video.preload = 'auto'; video.load(); }
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    };
    video.addEventListener('playing', () => video.classList.add('est-lue'), { once: true });
    new IntersectionObserver((entrees) => {
      visible = entrees[0].isIntersecting;
      jouer();
    }, { rootMargin: '120px 0px' }).observe(video.closest('section') || video);
    document.addEventListener('visibilitychange', jouer);
    if (calme.addEventListener) calme.addEventListener('change', jouer);
  }

  /* ─────────────── Le portrait ───────────────
     Il se pose une fois, quand il entre à l'écran ; l'observateur se retire
     aussitôt. Sans script ou en mouvement réduit, il est là d'emblée. */
  const portraits = document.querySelectorAll('[data-apparait]');
  if (portraits.length && 'IntersectionObserver' in window && !calme.matches) {
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
    portraits.forEach((x) => io.observe(x));
  }

  /* ─────────────── La visionneuse ─────────────── */
  const OEUVRES = {
    'akari': {
      titre: 'Akari', ligne: 'Popsan, 2026. Huile sur toile, 60 × 60 cm.',
      scene: 'Une femme de profil, les cheveux relevés et piqués de peignes, tient une lanterne de papier allumée contre sa poitrine. Autour d’elle il n’y a que la nuit, et la lanterne seule dessine son front, sa joue et la ligne de son cou.',
      image: 'accueil/images/akari-2000', l: 2000, h: 1953
    },
    'tsuki': {
      titre: 'Tsuki', ligne: 'Popsan, 2026. Huile sur toile, 60 × 60 cm.',
      scene: 'Une jeune femme en kimono tient au creux de ses mains une pleine lune, comme si on l’avait descendue jusqu’à elle. Toute la lumière part de là : elle éclaire son visage baissé et ses doigts, puis s’éteint dans la nuit brune.',
      image: 'accueil/images/tsuki-2000', l: 2000, h: 1999
    },
    'kingyo': {
      titre: 'Kingyo', ligne: 'Popsan, 2026. Huile sur toile, 60 × 60 cm.',
      scene: 'Tête baissée, une jeune femme tient à deux mains un bol d’eau où tourne un poisson rouge. Elle le porte comme on porte une chose qui compte vraiment, et qu’un geste trop brusque suffirait à renverser.',
      image: 'accueil/images/kingyo-1973', l: 1973, h: 2000
    },
    'imari-cortex': {
      titre: 'Imari Cortex', ligne: 'Medsan. Tirage d’art sur toile, signé et numéroté, rehaussé au vernis, 40 × 40 cm ou 60 × 60 cm. 20 exemplaires par format.',
      scene: 'Un cerveau humain a pris la forme d’un bol de porcelaine bleue et blanche semé de fleurs rouges, parcouru de fissures dorées. Ce qui s’est brisé a été repris chemin après chemin, comme le cerveau se recâble autour d’une lésion.',
      image: 'accueil/images/imari-cortex-2000', l: 2000, h: 2000
    },
    'koi-look': {
      titre: 'Koi Look', ligne: 'Medsan. Huile sur toile, 80 × 80 cm.',
      scene: 'Un œil humain grand ouvert est devenu bassin, et des carpes koï rouges et blanches nagent en cercle autour de l’iris. Ce sont les petites ombres qui dérivent parfois dans le regard, changées en poissons sacrés que l’œil garde en lui.',
      image: 'accueil/images/koi-look-2000', l: 2000, h: 2000
    },
    'hokusai-s-jaw': {
      titre: 'Hokusai’s Jaw', ligne: 'Medsan. Tirage d’art sur toile, signé et numéroté, rehaussé au vernis, 40 × 40 cm ou 60 × 60 cm. 20 exemplaires par format.',
      scene: 'Une mâchoire humaine est prise dans de hautes vagues blanches et bleues qui se brisent autour d’elle. La bouche voudrait s’ouvrir sur des mots, mais la mer s’est installée entre la pensée et la parole.',
      image: 'accueil/images/hokusai-s-jaw-1522', l: 1522, h: 1524
    }
  };

  /* La même chose en anglais : scènes et alt de contenu/oeuvres.json, mentions du site. */
  const OEUVRES_EN = {
    'akari': {
      ligne: 'Popsan, 2026. Oil on canvas, 60 × 60 cm.',
      scene: 'A woman in profile, her hair pinned up with combs, holds a lit paper lantern against her chest. There is nothing around her but the night, and the lantern alone draws her brow, her cheek and the line of her neck.'
    },
    'tsuki': {
      ligne: 'Popsan, 2026. Oil on canvas, 60 × 60 cm.',
      scene: 'A young woman in a kimono holds a full moon in her cupped hands, as if it had been brought down to her. All the light starts there, catching her lowered face and her fingers before fading into the brown dark.'
    },
    'kingyo': {
      ligne: 'Popsan, 2026. Oil on canvas, 60 × 60 cm.',
      scene: 'Head bowed, a young woman holds in both hands a bowl of water where a goldfish circles. She carries it the way one carries something that truly matters, something a single careless movement could spill.'
    },
    'imari-cortex': {
      ligne: 'Medsan. Fine art print on canvas, signed and numbered, varnish-enhanced, 40 × 40 cm or 60 × 60 cm. Edition of 20 per size.',
      scene: 'A human brain has taken the form of a blue and white porcelain bowl strewn with red flowers and run through with golden cracks. What broke has been mended path by path, the way a brain rewires itself around an injury.'
    },
    'koi-look': {
      ligne: 'Medsan. Oil on canvas, 80 × 80 cm.',
      scene: 'A wide-open human eye has become a pond, and red and white koi swim in circles around the iris. They are the small shadows that sometimes drift across our sight, turned into sacred fish the eye keeps within it.'
    },
    'hokusai-s-jaw': {
      ligne: 'Medsan. Fine art print on canvas, signed and numbered, varnish-enhanced, 40 × 40 cm or 60 × 60 cm. Edition of 20 per size.',
      scene: 'A human jaw is caught in tall blue and white waves breaking all around it. The mouth would open onto words, but the sea has settled between thought and speech.'
    }
  };
  if (EN) for (const id of Object.keys(OEUVRES_EN)) Object.assign(OEUVRES[id], OEUVRES_EN[id]);

  const dlg = document.querySelector('[data-visionneuse]');
  if (dlg && typeof dlg.showModal === 'function') {
    const img = dlg.querySelector('[data-image]');
    const vue = dlg.querySelector('[data-vue]');
    const titre = dlg.querySelector('[data-titre]');
    const ligne = dlg.querySelector('[data-ligne]');
    const scene = dlg.querySelector('[data-scene]');
    const boutonZoom = dlg.querySelector('[data-zoom]');
    let declencheur = null;
    let courante = null;

    const zoomer = (actif, px, py) => {
      dlg.classList.toggle('est-zoom', actif);
      boutonZoom.setAttribute('aria-pressed', String(actif));
      boutonZoom.textContent = actif ? (EN ? 'Zoom out' : 'Réduire') : (EN ? 'Zoom in' : 'Agrandir');
      if (actif && courante) {
        // L'image à sa pleine définition (au moins deux fois l'écran).
        const largeur = Math.max(courante.l / Math.min(window.devicePixelRatio || 1, 2), vue.clientWidth * 1.8);
        img.style.width = Math.round(largeur) + 'px';
        const rx = px ?? 0.5, ry = py ?? 0.5;
        requestAnimationFrame(() => {
          vue.scrollLeft = img.offsetWidth * rx - vue.clientWidth / 2;
          vue.scrollTop = img.offsetHeight * ry - vue.clientHeight / 2;
        });
      } else {
        img.style.width = '';
      }
    };

    const ouvrirOeuvre = (id, bouton) => {
      const o = OEUVRES[id];
      if (!o) return;
      courante = o;
      declencheur = bouton;
      const vignette = bouton.querySelector('img');
      img.alt = vignette ? vignette.alt : o.titre;
      img.width = o.l; img.height = o.h;
      img.src = RACINE + o.image + '.jpg';
      titre.textContent = o.titre;
      ligne.textContent = o.ligne;
      scene.textContent = o.scene;
      zoomer(false);
      dlg.showModal();
      dlg.querySelector('[data-fermer]').focus();
    };

    document.querySelectorAll('[data-oeuvre]').forEach((b) => {
      b.addEventListener('click', () => ouvrirOeuvre(b.dataset.oeuvre, b));
    });

    dlg.querySelector('[data-fermer]').addEventListener('click', () => dlg.close());
    boutonZoom.addEventListener('click', () => zoomer(!dlg.classList.contains('est-zoom')));
    img.addEventListener('click', (e) => {
      const r = img.getBoundingClientRect();
      if (dlg.classList.contains('est-zoom')) zoomer(false);
      else zoomer(true, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    // Un clic sur le fond (hors de l'image et des commandes) referme.
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target === vue) dlg.close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === '+' || e.key === '=') zoomer(true);
      else if (e.key === '-' || e.key === '0') zoomer(false);
    });
    dlg.addEventListener('close', () => {
      zoomer(false);
      if (declencheur) declencheur.focus();
    });
  }
})();
