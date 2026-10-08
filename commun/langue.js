/* williamsan.art — la langue du visiteur : le français à la racine, l'anglais sous /en/.
 *
 * Pourquoi dans le navigateur, et pas sur le serveur : l'hébergement de
 * williamsan.art n'est pas encore choisi. Une redirection serveur (lecture de
 * l'en-tête Accept-Language) s'écrit différemment chez chaque hébergeur
 * (Netlify, Cloudflare, Apache…) et n'existe pas du tout sur un hébergement
 * statique simple. Ce script marche partout, à l'identique. Le jour où
 * l'hébergeur le permet, la même règle pourra passer côté serveur (302 et
 * Vary: Accept-Language) ; ce fichier restera alors comme filet.
 *
 * Les règles :
 * 1. Un choix fait au sélecteur FR / EN est mémorisé et prime toujours.
 * 2. Sans choix mémorisé, un visiteur dont la langue préférée du navigateur
 *    n'est pas le français, arrivé sur une page française, part vers la même
 *    page en anglais ; un francophone arrivé sur /en/ part vers la même page
 *    en français.
 * 3. Jamais pour un robot d'indexation ou d'aperçu : chaque version doit
 *    rester lisible à sa propre adresse (canonique et hreflang).
 * 4. Jamais de boucle : au plus une redirection automatique par session, et
 *    aucune quand on vient d'une autre page du site (on y a déjà choisi).
 *
 * Chargé dans le <head>, sans defer, après les liens hreflang : la redirection
 * part avant le premier affichage.
 */
(() => {
  'use strict';

  const CLE = 'williamsan:langue';
  const DEJA = 'williamsan:langue-auto';
  const ROBOTS = /bot\b|bot\/|bot;|crawl|spider|slurp|google|bing|yandex|baidu|duckduck|qwant|seznam|sogou|exabot|ia_archiver|facebookexternalhit|facebot|embedly|pinterest|whatsapp|telegram|skype|discord|slack|vkshare|quora|redditbot|applebot|petalbot|semrush|ahrefs|mj12|dotbot|bytespider|gptbot|chatgpt|claude|perplexity|ccbot|lighthouse|pagespeed|headless|phantomjs|prerender|preview|validator/i;

  const ici = document.documentElement.lang === 'en' ? 'en' : 'fr';
  const lire = (stock, cle) => { try { return window[stock].getItem(cle); } catch (e) { return null; } };
  const ecrire = (stock, cle, v) => { try { window[stock].setItem(cle, v); } catch (e) { /* stockage bloqué */ } };

  /* ───── 1. Le sélecteur : retenir le choix, garder l'endroit de la page ───── */
  document.addEventListener('click', (e) => {
    const lien = e.target.closest && e.target.closest('a[data-langue]');
    if (!lien) return;
    ecrire('localStorage', CLE, lien.dataset.langue);
    ecrire('sessionStorage', CLE, lien.dataset.langue);
    // Les ancres sont les mêmes dans les deux langues (#contact, #oeuvres…).
    if (location.hash && !lien.hash) lien.hash = location.hash;
  });

  /* ───── 2. La première arrivée ───── */
  const choix = lire('localStorage', CLE) || lire('sessionStorage', CLE);
  if (choix === 'fr' || choix === 'en') return;                 // un choix a été fait : on le respecte
  if (ROBOTS.test(navigator.userAgent || '')) return;          // un robot lit chaque version à son adresse
  if (lire('sessionStorage', DEJA)) return;                    // déjà redirigé dans cette session
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin) return;  // navigation interne
  } catch (e) { /* référent illisible : on continue */ }

  const prefere = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
  if (!prefere) return;
  const voulue = prefere.slice(0, 2) === 'fr' ? 'fr' : 'en';
  if (voulue === ici) return;

  // La page doit déclarer sa traduction ; l'adresse se déduit de la racine du site,
  // là où vit ce script (…/commun/langue.js), pour marcher aussi en local.
  if (!document.querySelector(`link[rel="alternate"][hreflang="${voulue}"]`)) return;
  const moi = document.currentScript && document.currentScript.src;
  if (!moi) return;
  const racine = new URL('../', moi).href;
  if (location.href.indexOf(racine) !== 0) return;
  const chemin = location.href.slice(racine.length);
  let cible;
  if (voulue === 'en') cible = racine + 'en/' + chemin;
  else if (chemin.indexOf('en/') === 0) cible = racine + chemin.slice(3);
  else return;

  ecrire('sessionStorage', DEJA, '1');
  location.replace(cible);
})();
