/* williamsan.art — « Écrire à William San », le formulaire de chaque page.
 *
 * L'envoi passe par la fonction send-contact de med-san.art, telle quelle :
 * { name, email, subject, message }, le téléphone en tête du message.
 * La clé est la clé publique (anon) déjà servie par le site med-san.art.
 *
 * Validation douce : un champ n'est jugé qu'une fois quitté, puis corrigé au
 * fil de la frappe. Rien ne tourne au repos : seulement des écouteurs.
 * Sans script, le formulaire s'ouvre dans la messagerie (mailto).
 * Sous /en/ (<html lang="en">), tous les messages sont en anglais ; l'envoi est le même.
 */
(() => {
  'use strict';

  const FONCTION = 'https://csffrmpxaagaifnlomyw.supabase.co/functions/v1/send-contact';
  const CLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZmZybXB4YWFnYWlmbmxvbXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTE0MjcsImV4cCI6MjA4OTQ4NzQyN30.PZC4hjCRw5zI6tvMdYhRqArTHiS9oo7lH4sklbw3_jo';
  const MAIL = 'hwilliam.pelletier@gmail.com';
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;   // un peu plus strict que la fonction, jamais moins
  const calme = matchMedia('(prefers-reduced-motion: reduce)');

  /* Les mots de l'interface, selon la langue de la page (<html lang="en"> sous /en/). */
  const EN = document.documentElement.lang === 'en';
  const T = EN ? {
    nom: 'Please enter your name.', nomLong: 'This name is too long.',
    email: 'Please enter your email, so that William San can reply.',
    emailFaux: 'This address looks incomplete, for example name@domain.com.',
    tel: 'This number looks incomplete; it is optional, so you can leave it empty.',
    message: 'Please write a few words.',
    demande: (titre, page) => `Enquiry about ${titre} · ${page}`,
    envoi: 'Sending', envoyer: 'Send', enCours: 'Sending…',
    unChamp: 'One field needs a second look.', champs: (n) => `${n} fields need a second look.`,
    tel_corps: 'Phone', refusee: 'This address was refused; please check it.',
    refus: 'Your message was not sent: the email address was refused.',
    delai: `Your message was not sent: the server did not answer in time. Please try again, or write to ${MAIL}.`,
    reseau: `Your message was not sent. Please check your connection and try again, or write to ${MAIL}.`,
    merci: (prenom, email) => `Thank you, ${prenom}. William San will reply to ${email}.`,
  } : {
    nom: 'Indiquez votre nom.', nomLong: 'Ce nom est trop long.',
    email: 'Indiquez votre e-mail, pour que William San puisse vous répondre.',
    emailFaux: 'Cette adresse semble incomplète, par exemple nom@domaine.fr.',
    tel: 'Ce numéro semble incomplet ; il est facultatif, vous pouvez le laisser vide.',
    message: 'Écrivez quelques mots.',
    demande: (titre, page) => `Demande pour ${titre} · ${page}`,
    envoi: 'Envoi en cours', envoyer: 'Envoyer', enCours: 'Envoi en cours…',
    unChamp: 'Un champ est à revoir.', champs: (n) => `${n} champs sont à revoir.`,
    tel_corps: 'Téléphone ', refusee: 'Cette adresse a été refusée ; vérifiez-la.',
    refus: 'Le message n’est pas parti : l’adresse e-mail a été refusée.',
    delai: `Le message n’est pas parti : le serveur n’a pas répondu à temps. Réessayez, ou écrivez à ${MAIL}.`,
    reseau: `Le message n’est pas parti. Vérifiez votre connexion et réessayez, ou écrivez à ${MAIL}.`,
    merci: (prenom, email) => `Merci ${prenom}. William San vous répondra à ${email}.`,
  };

  const form = document.querySelector('[data-mot]');
  if (!form || !window.fetch) return;
  const merci = form.parentElement.querySelector('[data-merci]');
  const statut = form.querySelector('[data-statut]');
  const bouton = form.querySelector('[data-envoyer]');
  const libelle = form.querySelector('[data-libelle]');
  const champs = {
    name: form.elements.name,
    email: form.elements.email,
    tel: form.elements.tel,
    message: form.elements.message,
  };

  const REGLES = {
    name: (v) => (!v ? T.nom : v.length > 100 ? T.nomLong : ''),
    email: (v) => (!v ? T.email : !EMAIL.test(v) ? T.emailFaux : ''),
    tel: (v) => (!v ? '' : (v.replace(/\D/g, '').length < 6 || /[^\d\s+().\-/]/.test(v)) ? T.tel : ''),
    message: (v) => (!v ? T.message : ''),
  };

  function juger(nom, montrer) {
    const c = champs[nom];
    const erreur = REGLES[nom](c.value.trim());
    if (montrer || c.dataset.touche) {
      const aide = c.parentElement.querySelector('[data-aide]');
      aide.textContent = erreur;
      if (erreur) c.setAttribute('aria-invalid', 'true');
      else c.removeAttribute('aria-invalid');
      c.parentElement.classList.toggle('est-faux', !!erreur);
      c.parentElement.classList.toggle('est-juste', !erreur && !!c.value.trim());
    }
    return erreur;
  }

  for (const nom of Object.keys(champs)) {
    const c = champs[nom];
    c.addEventListener('blur', () => {
      if (c.value.trim() || c.dataset.touche) { c.dataset.touche = '1'; juger(nom); }
    });
    c.addEventListener('input', () => { if (c.dataset.touche) juger(nom); });
  }

  // Message prérempli : le curseur se pose à la fin, prêt à écrire.
  champs.message.addEventListener('focus', () => {
    const c = champs.message;
    if (c.dataset.prerempli === c.value) {
      const n = c.value.length;
      requestAnimationFrame(() => c.setSelectionRange(n, n));
    }
  });
  if (champs.message.value) champs.message.dataset.prerempli = champs.message.value;

  /* ───── « Demander cette œuvre », « Une question sur ce tirage » : le formulaire, prérempli ───── */
  function venir(titre) {
    if (titre) {
      form.dataset.sujet = T.demande(titre, form.dataset.sujetPage);
      const m = champs.message;
      if (!m.value.trim() || m.value === m.dataset.prerempli) {
        m.value = form.dataset.modele.replace('{titre}', titre);
        m.dataset.prerempli = m.value;
      }
    }
    if (!merci.hidden) recommencer(false);
    const cible = ['name', 'email', 'message'].map((n) => champs[n]).find((c) => !c.value.trim()) || champs.message;
    form.scrollIntoView({ behavior: calme.matches ? 'auto' : 'smooth', block: 'center' });
    cible.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const lien = e.target.closest('[data-demande]');
    if (!lien || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const dlg = lien.closest('dialog');
    let titre = lien.dataset.demande;
    if (!titre && dlg) {
      const t = dlg.querySelector('[data-titre]');
      titre = t ? t.textContent.trim() : '';
    }
    if (dlg && dlg.open) {
      // la fenêtre rend d'abord le focus à la carte ; on le reprend ensuite
      dlg.addEventListener('close', () => venir(titre), { once: true });
      dlg.close();
    } else venir(titre);
  });

  /* ───── L'envoi ───── */
  function etat(nom, texte) {
    form.dataset.etat = nom;
    statut.textContent = texte || '';
  }

  function bloquer(oui) {
    for (const c of Object.values(champs)) c.readOnly = oui;
    bouton.setAttribute('aria-disabled', String(oui));
    form.setAttribute('aria-busy', String(oui));
    libelle.textContent = oui ? T.envoi : T.envoyer;
  }

  function recommencer(focus = true) {
    form.reset();
    delete champs.message.dataset.prerempli;
    form.dataset.sujet = form.dataset.sujetPage;
    for (const c of Object.values(champs)) {
      delete c.dataset.touche;
      c.removeAttribute('aria-invalid');
      c.parentElement.classList.remove('est-faux', 'est-juste');
      c.parentElement.querySelector('[data-aide]').textContent = '';
    }
    etat('', '');
    merci.hidden = true;
    form.hidden = false;
    if (focus) champs.name.focus();
  }

  merci.querySelector('[data-encore]').addEventListener('click', () => recommencer());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.etat === 'envoi') return;

    const fautes = Object.keys(champs).filter((n) => { champs[n].dataset.touche = '1'; return juger(n, true); });
    if (fautes.length) {
      etat('faux', fautes.length === 1 ? T.unChamp : T.champs(fautes.length));
      champs[fautes[0]].focus();
      return;
    }

    const v = (n) => champs[n].value.trim();
    // Le champ piège, invisible : seul un robot le remplit. On fait mine d'avoir envoyé.
    if (form.elements.site && form.elements.site.value) { reussir(v('name'), v('email')); return; }

    const corps = {
      name: v('name'),
      email: v('email'),
      subject: (form.dataset.sujet || 'williamsan.art').slice(0, 200),
      message: ((v('tel') ? `${T.tel_corps}: ${v('tel')}\n\n` : '') + v('message')).slice(0, 5000),
    };

    etat('envoi', T.enCours);
    bloquer(true);
    const arret = new AbortController();
    const minuteur = setTimeout(() => arret.abort(), 15000);
    try {
      const r = await fetch(FONCTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CLE, Authorization: `Bearer ${CLE}` },
        body: JSON.stringify(corps),
        signal: arret.signal,
      });
      const donnees = await r.json().catch(() => ({}));
      if (!r.ok || !donnees.success) throw Object.assign(new Error('refus'), { statut: r.status, donnees });
      bloquer(false);
      reussir(corps.name, corps.email);
    } catch (err) {
      bloquer(false);
      const refus = err && err.donnees && err.donnees.error ? String(err.donnees.error) : '';
      if (/email/i.test(refus)) {
        champs.email.parentElement.querySelector('[data-aide]').textContent = T.refusee;
        champs.email.setAttribute('aria-invalid', 'true');
        champs.email.parentElement.classList.add('est-faux');
        champs.email.focus();
        etat('erreur', T.refus);
      } else {
        etat('erreur', err && err.name === 'AbortError' ? T.delai : T.reseau);
      }
    } finally {
      clearTimeout(minuteur);
    }
  });

  function reussir(nom, email) {
    etat('envoye', '');
    const prenom = nom.split(/\s+/)[0];
    merci.querySelector('[data-merci-texte]').textContent = T.merci(prenom, email);
    form.hidden = true;
    merci.hidden = false;
    merci.focus({ preventScroll: true });
  }
})();
