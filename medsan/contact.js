/* williamsan.art — la section contact : une vidéo d'ambiance muette, lente, en boucle.
 *
 * L'image fixe est toujours là, dessous. La vidéo ne se charge qu'à l'approche
 * de la section, ne joue que lorsqu'elle est visible, et jamais en mouvement
 * réduit ni en mode économie de données : on garde alors l'image fixe.
 */
(() => {
  'use strict';

  const reduit = matchMedia('(prefers-reduced-motion: reduce)');
  const economie = !!(navigator.connection && navigator.connection.saveData);

  for (const fond of document.querySelectorAll('[data-contact-fond]')) {
    const image = fond.querySelector('[data-contact-image]');
    // image fixe absente : le fond de la section suffit
    if (image) image.addEventListener('error', () => image.remove(), { once: true });
    if (economie || !('IntersectionObserver' in window) || !fond.dataset.video) continue;

    let video = null, visible = false, enPanne = false;

    function creer() {
      video = document.createElement('video');
      video.className = 'contact__video';
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('tabindex', '-1');
      video.disablePictureInPicture = true;
      video.preload = 'auto';
      if (image && image.getAttribute('src')) video.poster = image.getAttribute('src');
      video.addEventListener('loadedmetadata', () => { video.defaultPlaybackRate = 0.8; video.playbackRate = 0.8; });
      video.addEventListener('playing', () => fond.classList.add('video-prete'));
      video.addEventListener('error', () => { enPanne = true; fond.classList.remove('video-prete'); video.remove(); video = null; }, { once: true });
      video.src = fond.dataset.video;
      fond.appendChild(video);
    }

    function regler() {
      if (reduit.matches || enPanne) {
        if (video) video.pause();
        fond.classList.remove('video-prete');
        return;
      }
      if (!visible) { if (video) video.pause(); return; }
      if (!video) creer();
      if (video) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      }
    }

    new IntersectionObserver((entrees) => {
      visible = entrees[entrees.length - 1].isIntersecting;
      regler();
    }, { rootMargin: '150px 0px' }).observe(fond);
    reduit.addEventListener('change', regler);
  }
})();
