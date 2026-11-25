
function lifeExecuter(commande) {
  lifeAttendCommande = false;

  const courses = JSON.parse(
    localStorage.getItem("lifeCourses") || "[]"
  );

  const nettoyerArticle = texte => {
    return lifeNormaliser(texte)
      .replace(/\b(les|le|la|des|du|de|un|une|comme|achete|achetes|achetee|achetees|dans|mes)\b/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/s\b/g, "");
  };

  // RECONNAÎTRE L'HEURE
  const heureMatch = commande.match(
    /\b(?:a\s*)?(\d{1,2})(?::(\d{2})|h(?:\s*(\d{1,2}))?| heures?(?:\s*(\d{1,2}))?)\b/
  );

  // AJOUTER UN ARTICLE
  const ajoutCourse = commande.match(
    /^(?:ajoute|ajouter|mets|met)\s+(.+?)\s+(?:a|aux|dans)\s+(?:(?:mes|ma)\s+)?courses?$/
  );

  if (ajoutCourse) {
    let nom = ajoutCourse[1].trim();
    nom = nom.replace(/^(des|du|de la|de l'|de|un|une)\s+/, "");

    if (!nom) {
      lifeDire("Quel article veux-tu ajouter ?");
      return;
    }

    courses.push({ name: nom, done: false });
    localStorage.setItem("lifeCourses", JSON.stringify(courses));
    lifeDire(nom + " ajouté à ta liste de courses.");

  // SUPPRIMER UN ARTICLE
  } else if (
    commande.includes("supprime") ||
    commande.includes("enleve") ||
    commande.includes("retire")
  ) {
    const nom = nettoyerArticle(
      commande
        .replace(/^(?:supprime|enleve|retire)\s+/, "")
        .replace(/\s+(?:de\s+)?(?:mes\s+)?courses?$/, "")
    );

    const index = courses.findIndex(article =>
      nettoyerArticle(article.name) === nom
    );

    if (index === -1) {
      lifeDire("Je ne trouve pas cet article dans tes courses.");
    } else {
      const article = courses.splice(index, 1)[0];
      localStorage.setItem("lifeCourses", JSON.stringify(courses));
      lifeDire(article.name + " supprimé de tes courses.");
    }

  // COCHER UN ARTICLE
  } else if (
    commande.includes("coche") ||
    commande.includes("achete") ||
    commande.includes("marque")
  ) {
    const nom = nettoyerArticle(
      commande
        .replace(/^(?:coche|marque)\s+/, "")
        .replace(/\s+(?:comme\s+)?achete(?:e)?s?$/, "")
        .replace(/\s+(?:dans\s+)?(?:mes\s+)?courses?$/, "")
    );

    const article = courses.find(item =>
      nettoyerArticle(item.name) === nom
    );

    if (!article) {
      lifeDire("Je ne trouve pas cet article dans tes courses.");
    } else {
      article.done = true;
      localStorage.setItem("lifeCourses", JSON.stringify(courses));
      lifeDire(article.name + " coché comme acheté.");
    }

  // AJOUTER UN RENDEZ-VOUS
  } else if (
    /^(?:ajoute|ajouter|mets|met)\s+(?:un\s+)?(?:rendez-vous|rendez vous|evenement)\b/.test(commande)
  ) {

    const dateMot = commande.match(
      /\b(aujourd'hui|demain)\b/
    );

    const moisMatch = commande.match(
      /\b(?:le\s+)?(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/
    );

    const dateChiffres = commande.match(
      /\b(?:le\s+)?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/
    );

    if ((!dateMot && !moisMatch && !dateChiffres) || !heureMatch) {
      lifeDire("Précise le jour et l'heure du rendez-vous.");
      return;
    }

    const maintenant = new Date();
    let dateRendezVous = new Date(maintenant);

    if (dateMot) {
      if (dateMot[1] === "demain") {
        dateRendezVous.setDate(dateRendezVous.getDate() + 1);
      }
    } else if (moisMatch) {
      const mois = [
        "janvier", "fevrier", "mars", "avril",
        "mai", "juin", "juillet", "aout",
        "septembre", "octobre", "novembre", "decembre"
      ];

      const jour = Number(moisMatch[1]);
      const numeroMois = mois.indexOf(moisMatch[2]);

      dateRendezVous = new Date(
        maintenant.getFullYear(),
        numeroMois,
        jour
      );

      if (
        dateRendezVous.getMonth() !== numeroMois ||
        dateRendezVous.getDate() !== jour
      ) {
        lifeDire("La date indiquée n'est pas valide.");
        return;
      }

      const aujourdHui = new Date(
        maintenant.getFullYear(),
        maintenant.getMonth(),
        maintenant.getDate()
      );

      if (dateRendezVous < aujourdHui) {
        dateRendezVous.setFullYear(
          dateRendezVous.getFullYear() + 1
        );
      }

    } else if (dateChiffres) {
      const jour = Number(dateChiffres[1]);
      const mois = Number(dateChiffres[2]);
      let annee = dateChiffres[3]
        ? Number(dateChiffres[3])
        : maintenant.getFullYear();

      if (annee < 100) annee += 2000;

      dateRendezVous = new Date(annee, mois - 1, jour);

      if (
        dateRendezVous.getFullYear() !== annee ||
        dateRendezVous.getMonth() !== mois - 1 ||
        dateRendezVous.getDate() !== jour
      ) {
        lifeDire("La date indiquée n'est pas valide.");
        return;
      }
    }

    const heure = Number(heureMatch[1]);
    const minutes = Number(
      heureMatch[2] || heureMatch[3] || heureMatch[4] || 0
    );

    if (heure > 23 || minutes > 59) {
      lifeDire("L'heure indiquée n'est pas valide.");
      return;
    }

    let nom = commande
      .replace(/^(?:ajoute|ajouter|mets|met)\s+(?:un\s+)?(?:rendez-vous|rendez vous|evenement)\s*/, "")
      .replace(
        dateMot ? dateMot[0] :
        moisMatch ? moisMatch[0] :
        dateChiffres[0], ""
      )
      .replace(heureMatch[0], "")
      .replace(/\b(le|a|pour)\b/g, " ")
      .trim()
      .replace(/\s+/g, " ");

    if (!nom) {
      lifeDire("Quel est le nom du rendez-vous ?");
      return;
    }

    const date = [
      dateRendezVous.getFullYear(),
      String(dateRendezVous.getMonth() + 1).padStart(2, "0"),
      String(dateRendezVous.getDate()).padStart(2, "0")
    ].join("-");

    const time =
      String(heure).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0");

    const events = JSON.parse(
      localStorage.getItem("lifeos_events") || "[]"
    );

    events.push({
      name: nom,
      date: date,
      time: time,
      reminder: false
    });

    events.sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );

    localStorage.setItem("lifeos_events", JSON.stringify(events));

    openPage("agenda");
    lifeDire("Ton rendez-vous " + nom + " est ajouté à ton agenda.");

  } else if (commande.includes("agenda")) {
    openPage("agenda");
    lifeDire("J'ouvre ton agenda.");

  } else if (commande.includes("budget")) {
    openPage("budget");
    lifeDire("J'ouvre ton budget.");

  } else if (commande.includes("tache")) {
    openPage("tasks");
    lifeDire("J'affiche tes tâches.");

  } else if (commande.includes("course")) {
    openPage("courses");
    lifeDire("J'ouvre tes courses.");

  } else if (
    commande.includes("accueil") ||
    commande.includes("maison")
  ) {
    openPage("home");
    lifeDire("Retour à l'accueil.");

  } else if (commande.includes("date")) {
    const date = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    lifeDire("Aujourd'hui, nous sommes le " + date);

  } else {
    lifeDire("Je n'ai pas compris. Réessaie.");
  }
}
