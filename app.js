
const pageContent = document.getElementById("pageContent");
// NOTIFICATIONS LIFE OS

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Notifications indisponibles.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

function checkAgendaReminders() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const events = JSON.parse(
    localStorage.getItem("lifeos_events") || "[]"
  );

  const now = new Date();

  events.forEach(event => {
    if (!event.reminder) return;

    const eventDate = new Date(event.date + "T" + event.time);
    const reminderTime = new Date(
      eventDate.getTime() - 15 * 60 * 1000
    );

    const reminderKey =
      "lifeos_reminded_" + event.name + "_" + event.date + "_" + event.time;

    if (
      now >= reminderTime &&
      now < eventDate &&
      !localStorage.getItem(reminderKey)
    ) {
      new Notification("Rappel LIFE OS", {
        body: event.name + " dans 15 minutes !"
      });

      localStorage.setItem(reminderKey, "1");
    }
  });
}

setInterval(checkAgendaReminders, 30000);
checkAgendaReminders();
const pages = {
  home: ["Accueil", "Bienvenue dans votre espace LIFE OS."],
  agenda: ["Mon agenda", "Vos rendez-vous et rappels."],
  budget: ["Mon budget", ""],
  courses: ["Mes courses", "Votre comparateur de prix."],
  tasks: ["Mes tâches", "Votre organisation quotidienne."],
  documents: ["Mes documents", "Vos documents importants."],
  activities: ["Mes activités", "Vos loisirs et sorties."],
  maison: ["Ma Maison", "Gérez votre maison au quotidien."],
  profile: ["Mon profil", "Vos paramètres personnels."],
  assistant: ["Assistant LIFE OS", "Votre assistant personnel."]
};


function updateHomeDashboard() {
  const summary = document.getElementById("summaryContent");
  if (!summary) return;

  // Lecture sécurisée des données
  function readData(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  const tasks = readData("lifeos_tasks");
  const events = readData("lifeos_events");
  const operations = readData("lifeos_operations");

  // Dates locales
  const now = new Date();

  function localDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const today = localDate(now);

  function formatDate(date) {
    if (!date) return "Date non définie";

    const parts = date.split("-");
    if (parts.length !== 3) return date;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function money(value) {
    return Number(value || 0).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR"
    });
  }

  // STATISTIQUES DES TÂCHES
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.done).length;
  const pendingTasks = tasks.filter(task => !task.done).length;

  const urgentTasks = tasks.filter(task =>
    !task.done &&
    ["urgent", "haute", "high"].includes(
      String(task.priority || "").toLowerCase()
    )
  ).length;

  const overdueTasks = tasks.filter(task =>
    !task.done && task.date && task.date < today
  ).length;

  const todayTasks = tasks.filter(task =>
    !task.done && task.date === today
  ).length;

  const progress = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // TÂCHES PRIORITAIRES
  const priorityOrder = {
    urgent: 0,
    haute: 0,
    high: 0,
    medium: 1,
    moyenne: 1,
    low: 2,
    basse: 2
  };

  const priorityTasks = tasks
    .filter(task => !task.done)
    .sort((a, b) => {
      const priorityA =
        priorityOrder[String(a.priority || "").toLowerCase()] ?? 3;
      const priorityB =
        priorityOrder[String(b.priority || "").toLowerCase()] ?? 3;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return String(a.date || "9999-99-99")
        .localeCompare(String(b.date || "9999-99-99"));
    })
    .slice(0, 5);

  // AGENDA
  function eventDateTime(event) {
    if (!event.date) return null;

    const date = new Date(
      `${event.date}T${event.time || "00:00"}`
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const todayEvents = events
    .filter(event => event.date === today)
    .sort((a, b) =>
      String(a.time || "").localeCompare(String(b.time || ""))
    );

  const upcomingEvents = events
    .filter(event => {
      const date = eventDateTime(event);
      return date && date >= now;
    })
    .sort((a, b) =>
      eventDateTime(a) - eventDateTime(b)
    );

  const nextEvent = upcomingEvents[0];

  // BUDGET
  const income = operations
    .filter(op => op.type === "income")
    .reduce((total, op) => total + (Number(op.amount) || 0), 0);

  const expenses = operations
    .filter(op => op.type === "expense")
    .reduce((total, op) => total + (Number(op.amount) || 0), 0);

  const balance = income - expenses;

  // MESSAGE INTELLIGENT
  let dailyMessage = "Bienvenue dans ton espace LIFE-OS.";

  if (overdueTasks > 0) {
    dailyMessage = `Tu as ${overdueTasks} tâche(s) en retard. Pense à les consulter.`;
  } else if (urgentTasks > 0) {
    dailyMessage = `${urgentTasks} tâche(s) urgente(s) demandent ton attention.`;
  } else if (pendingTasks === 0 && totalTasks > 0) {
    dailyMessage = "Bravo ! Toutes tes tâches sont terminées.";
  } else if (pendingTasks > 0) {
    dailyMessage = "Continue comme ça, tu avances dans tes objectifs !";
  }

  if (operations.length === 0) {
    dailyMessage += " Ton budget est prêt à être renseigné.";
  }

  // LISTE DES TÂCHES
  const taskHTML = priorityTasks.length
    ? priorityTasks.map(task => `
        <div class="dashboard-line">
          <span>${escapeHTML(task.name || "Tâche sans nom")}</span>
          <span>${task.date ? formatDate(task.date) : "Sans date"}</span>
        </div>
      `).join("")
    : `<p>Aucune tâche en attente. Tout est à jour !</p>`;

  // LISTE DES RENDEZ-VOUS DU JOUR
  const eventHTML = todayEvents.length
    ? todayEvents.map(event => `
        <div class="dashboard-line">
          <span>${escapeHTML(event.name || "Événement")}</span>
          <span>${escapeHTML(event.time || "")}</span>
        </div>
      `).join("")
    : `<p>Aucun rendez-vous aujourd'hui.</p>`;

  // PROCHAIN RENDEZ-VOUS
  const nextEventHTML = nextEvent
    ? `
      <h3>${escapeHTML(nextEvent.name || "Événement")}</h3>
      <p>${formatDate(nextEvent.date)} à ${escapeHTML(nextEvent.time || "--:--")}</p>
    `
    : `<p>Aucun rendez-vous à venir.</p>`;

  // AFFICHAGE DU TABLEAU DE BORD
  summary.innerHTML = `
    <div class="dashboard">

      <div class="dashboard-card">
        <h3>🚀 Progression générale</h3>

        <div class="dashboard-number">
          <span data-counter="${progress}">0</span>%
        </div>

        <div style="
          width:100%;
          height:12px;
          background:#172B46;
          border-radius:20px;
          overflow:hidden;
          margin:12px 0;
        ">
          <div id="dashboardProgressFill" style="
            width:0%;
            height:100%;
            background:linear-gradient(90deg,#168BFF,#19D5FF);
            border-radius:20px;
            transition:width 1.2s ease;
          "></div>
        </div>

        <p>${completedTasks} tâche(s) terminée(s) sur ${totalTasks}</p>
      </div>

      <div class="dashboard-card">
        <h3>📊 Statistiques des tâches</h3>

        <div class="dashboard-line">
          <span>Terminées</span>
          <strong data-counter="${completedTasks}">0</strong>
        </div>

        <div class="dashboard-line">
          <span>En attente</span>
          <strong data-counter="${pendingTasks}">0</strong>
        </div>

        <div class="dashboard-line">
          <span>Urgentes</span>
          <strong data-counter="${urgentTasks}">0</strong>
        </div>

        <div class="dashboard-line">
          <span>En retard</span>
          <strong data-counter="${overdueTasks}">0</strong>
        </div>

        <div class="dashboard-line">
          <span>À faire aujourd'hui</span>
          <strong data-counter="${todayTasks}">0</strong>
        </div>

        <button id="viewTasksBtn">Voir toutes mes tâches</button>
      </div>

      <div class="dashboard-card">
        <h3>📅 Agenda du jour</h3>

        <div class="dashboard-number">
          <span data-counter="${todayEvents.length}">0</span>
        </div>

        ${eventHTML}
      </div>

      <div class="dashboard-card">
        <h3>⏰ Prochain rendez-vous</h3>
        ${nextEventHTML}
      </div>

      <div class="dashboard-card">
        <h3>💰 Mon budget</h3>

        <div class="dashboard-line">
          <span>Revenus</span>
          <strong>${money(income)}</strong>
        </div>

        <div class="dashboard-line">
          <span>Dépenses</span>
          <strong>${money(expenses)}</strong>
        </div>

        <div class="dashboard-balance">
          <span>Solde disponible</span>
          <strong>${money(balance)}</strong>
        </div>
      </div>

      <div class="dashboard-card">
        <h3>🎯 Mes tâches prioritaires</h3>
        ${taskHTML}
      </div>

      <div class="dashboard-card dashboard-smart">
        <h3>🤖 LIFE-OS Intelligence</h3>
        <p>${escapeHTML(dailyMessage)}</p>
      </div>

    </div>
  `;

  // ANIMATION DES COMPTEURS
  const counters = summary.querySelectorAll("[data-counter]");

  counters.forEach(counter => {
    const target = Number(counter.dataset.counter) || 0;
    const duration = 800;
    const startTime = performance.now();

    function animateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progressValue = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progressValue, 3);

      counter.textContent = Math.round(target * eased);

      if (progressValue < 1) {
        requestAnimationFrame(animateCounter);
      }
    }

    requestAnimationFrame(animateCounter);
  });

  // ANIMATION DE LA JAUGE
  requestAnimationFrame(() => {
    const progressFill = document.getElementById(
      "dashboardProgressFill"
    );

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
  });

  // BOUTON VERS LES TÂCHES
  const viewTasksBtn = document.getElementById("viewTasksBtn");

  if (viewTasksBtn) {
    viewTasksBtn.addEventListener("click", () => {
      openPage("tasks");
    });
  }
}


function showCourses() {
  let courses = JSON.parse(
    localStorage.getItem("lifeCourses") || "[]"
  );

  function sauvegarder() {
    localStorage.setItem("lifeCourses", JSON.stringify(courses));
  }

  pageContent.innerHTML = `
    <div class="tasks-container">
      <h2>🛒 Mes courses</h2>

      <div class="tasks-form">
        <input id="courseName" type="text"
          placeholder="Nom de l'article...">

        <input id="coursePrice" type="number"
          min="0" step="0.01"
          placeholder="Prix en €">

        <button id="addCourseBtn">➕ Ajouter</button>
      </div>

      <div id="coursesTotal"></div>
      <div id="coursesList"></div>
    </div>
  `;

  function afficherCourses() {
    const liste = document.getElementById("coursesList");

    const total = courses.reduce((somme, article) => {
      const prix = Number(article.price);
      return somme + (
        article.price !== undefined &&
        article.price !== "" &&
        Number.isFinite(prix) && prix >= 0
          ? prix
          : 0
      );
    }, 0);

    document.getElementById("coursesTotal").innerHTML = `
      <div class="budget-card">
        <small>🧾 Total estimé des courses</small>
        <h2>${total.toFixed(2)} €</h2>
      </div>
    `;

    if (courses.length === 0) {
      liste.innerHTML = "<p>Ta liste est vide.</p>";
      return;
    }

    const rayons = {};

    courses.forEach((article, index) => {
      const rayon = trouverRayon(article.name);

      if (!rayons[rayon]) {
        rayons[rayon] = [];
      }

      rayons[rayon].push({ ...article, index });
    });

    liste.innerHTML = Object.keys(rayons).map(rayon => `
      <div class="course-category">
        <h3>${rayon}</h3>

        ${rayons[rayon].map(article => `
          <div class="task-card ${article.done ? "task-done" : ""}">
            <label>
              <input type="checkbox"
                data-course-check="${article.index}"
                ${article.done ? "checked" : ""}>
              <strong>${escapeHTML(article.name)}</strong>
            </label>

            <span>
              ${article.price !== undefined &&
                article.price !== "" &&
                Number.isFinite(Number(article.price))
                  ? Number(article.price).toFixed(2) + " €"
                  : "Prix non renseigné"}
            </span>

            <button data-course-delete="${article.index}">🗑️</button>
          </div>
        `).join("")}
      </div>
    `).join("");

    liste.querySelectorAll("[data-course-check]").forEach(btn => {
      btn.onchange = () => {
        courses[Number(btn.dataset.courseCheck)].done = btn.checked;
        sauvegarder();
        afficherCourses();
      };
    });

    liste.querySelectorAll("[data-course-delete]").forEach(btn => {
      btn.onclick = () => {
        courses.splice(Number(btn.dataset.courseDelete), 1);
        sauvegarder();
        afficherCourses();
      };
    });
  }

  document.getElementById("addCourseBtn").onclick = () => {
    const champ = document.getElementById("courseName");
    const champPrix = document.getElementById("coursePrice");
    const nom = champ.value.trim();

    if (!nom) {
      alert("Écris le nom d'un article.");
      return;
    }

    const prix = champPrix.value.trim();

    if (prix !== "" && (
      !Number.isFinite(Number(prix)) || Number(prix) < 0
    )) {
      alert("Entre un prix valide.");
      return;
    }

    courses.push({
      name: nom,
      price: prix === "" ? null : Number(prix),
      done: false
    });

    sauvegarder();
    champ.value = "";
    champPrix.value = "";
    afficherCourses();
    champ.focus();
  };

  document.getElementById("courseName").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      document.getElementById("addCourseBtn").click();
    }
  });

  afficherCourses();
}

  function trouverRayon(nom) {
  const article = nom.toLowerCase();

  if (/pomme|banane|orange|tomate|salade|carotte|fruit|legume/.test(article))
    return "🍎 Fruits et légumes";

  if (/lait|fromage|yaourt|beurre|creme/.test(article))
    return "🥛 Produits laitiers";

  if (/pain|baguette|croissant|brioche/.test(article))
    return "🥖 Boulangerie";

  if (/poulet|boeuf|porc|poisson|viande|steak/.test(article))
    return "🥩 Viande et poisson";

  if (/eau|jus|cafe|the|soda/.test(article))
    return "🥤 Boissons";

  if (/lessive|liquide vaisselle|nettoyant|eponge/.test(article))
    return "🧽 Entretien";

  if (/savon|shampoing|dentifrice|gel douche/.test(article))
    return "🧴 Hygiène";

  return "📦 Autres";
}

function openPage(name) {
  if (!pages[name]) return;

  const welcome = document.querySelector("main > .welcome");
  const mainTitle = document.querySelector("main > h2");
  const modules = document.querySelector(".modules");
  const summary = document.querySelector(".summary");

  if (welcome) welcome.style.display = name === "home" ? "flex" : "none";
  if (mainTitle) mainTitle.style.display = name === "home" ? "block" : "none";
  if (modules) modules.style.display = name === "home" ? "grid" : "none";
  if (summary) summary.style.display = name === "home" ? "block" : "none";

  if (name === "budget") {
    showBudget();
  } else if (name === "agenda") {
    showAgenda();
  } else if (name === "tasks") {
    showTasks();
  } else if (name === "courses") {
  showCourses();
} else if (name === "maison") {
  showMaison();
  
} else {
    pageContent.innerHTML = `
      <h2>${pages[name][0]}</h2>
      <p>${pages[name][1]}</p>
    `;
  }

  if (name === "home") {
    updateHomeDashboard();
  }

  pageContent.style.display = name === "home" ? "none" : "block";

  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showMaison() {
  pageContent.innerHTML = `
    <h2>🏡 Ma Maison</h2>
    <p>Tout pour organiser et entretenir votre maison.</p>

    <section class="modules">
      <button class="module" onclick="ouvrirMaison('menage')">
        <span>🧹</span>
        <b>Ménage et rangement</b>
        <small>Organisez votre entretien quotidien</small>
      </button>

      <button class="module" onclick="ouvrirMaison('entretien')">
        <span>🔧</span>
        <b>Entretien des équipements</b>
        <small>Suivez vos entretiens et rappels</small>
      </button>

      <button class="module" onclick="ouvrirMaison('planning')">
        <span>📅</span>
        <b>Planning hebdomadaire</b>
        <small>Planifiez votre semaine</small>
      </button>

      <button class="module" onclick="ouvrirMaison('reparations')">
        <span>🛠️</span>
        <b>Réparations et travaux</b>
        <small>Suivez vos travaux</small>
      </button>

      <button class="module" onclick="ouvrirMaison('stocks')">
        <span>📦</span>
        <b>Stocks de la maison</b>
        <small>Gérez vos réserves</small>
      </button>
    </section>
  `;
}
function   showAgenda() {
  const events = JSON.parse(
    localStorage.getItem("lifeos_events") || "[]"
  );

  const today = new Date().toISOString().slice(0, 10);

  pageContent.innerHTML = `
    <button id="backHome" class="back-button">← Retour</button>
    <h2>Mon agenda</h2>
    <p>Organisez vos rendez-vous et votre quotidien.</p>

    <div class="agenda-card">
      <h3>Nouveau rendez-vous</h3>
      <form id="agendaForm">
        <input id="eventName" placeholder="Nom du rendez-vous" required>
        <input id="eventDate" type="date" value="${today}" required>
        <input id="eventTime" type="time" required>
        <input id="eventReminder" type="checkbox">
        <label for="eventReminder">Activer un rappel</label>
        <button type="submit">Ajouter au calendrier</button>
      </form>
    </div>

    <h3>Mes rendez-vous</h3>
    <div id="eventList">
      ${events.length ? events.map((event, index) => `
        <div class="operation">
          <div>
            <b>${escapeHTML(event.name)}</b>
            <p>${event.date} à ${event.time}</p>
            <small>${event.reminder ? "🔔 Rappel souhaité" : ""}</small>
          </div>
          <button class="edit-event" data-index="${index}">✎</button>
<button class="delete-event" data-index="${index}">×</button>
        </div>
      `).join("") : "<p>Aucun rendez-vous enregistré.</p>"}
    </div>
  `;

  document.getElementById("backHome").onclick = () => openPage("home");

  document.getElementById("agendaForm").onsubmit = async event => {
    event.preventDefault();

    events.push({
      name: document.getElementById("eventName").value.trim(),
      date: document.getElementById("eventDate").value,
      time: document.getElementById("eventTime").value,
      reminder: document.getElementById("eventReminder").checked
    });

    events.sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );

    localStorage.setItem("lifeos_events", JSON.stringify(events));
    showAgenda();
  };
document.querySelectorAll(".edit-event").forEach(button => {
  button.onclick = () => {
    const index = Number(button.dataset.index);
    const event = events[index];

    const newName = prompt("Modifier le rendez-vous :", event.name);
    if (newName === null || !newName.trim()) return;

    const newDate = prompt("Nouvelle date (AAAA-MM-JJ) :", event.date);
    if (newDate === null) return;

    const newTime = prompt("Nouvelle heure (HH:MM) :", event.time);
    if (newTime === null) return;

    event.name = newName.trim();
    event.date = newDate;
    event.time = newTime;

    events.sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );

    localStorage.setItem("lifeos_events", JSON.stringify(events));
    showAgenda();
  };
});
  document.querySelectorAll(".delete-event").forEach(button => {
    button.onclick = () => {
      events.splice(Number(button.dataset.index), 1);
      localStorage.setItem("lifeos_events", JSON.stringify(events));
      showAgenda();
    };
  });
}


function showBudget() {
  const operations = JSON.parse(
    localStorage.getItem("lifeos_operations") || "[]"
  );

  const income = operations
    .filter(op => op.type === "income")
    .reduce((sum, op) => sum + op.amount, 0);

  const expenses = operations
    .filter(op => op.type === "expense")
    .reduce((sum, op) => sum + op.amount, 0);

  pageContent.innerHTML = `
    <button id="backHome" class="back-button">← Retour</button>
    <h2>Mon budget</h2>
    <p>Votre tableau de bord financier</p>

    <div class="budget-card">
      <small>Solde disponible</small>
      <h1>${(income - expenses).toFixed(2)} €</h1>
    </div>

    <div class="budget-grid">
      <div class="budget-stat">
        <small>Revenus</small>
        <h3>${income.toFixed(2)} €</h3>
      </div>
      <div class="budget-stat">
        <small>Dépenses</small>
        <h3>${expenses.toFixed(2)} €</h3>
      </div>
    </div>

    <h3>Nouvelle opération</h3>
    <form id="budgetForm">
      <input id="operationName" placeholder="Description" required>
      <input id="operationAmount" type="number"
        step="0.01" min="0.01" placeholder="Montant en euros" required>
      <select id="operationType">
        <option value="income">Revenu</option>
        <option value="expense">Dépense</option>
      </select>
      <button type="submit">Ajouter l'opération</button>
    </form>

    <h3>Historique</h3>
    <div id="history">
      ${operations.length ? operations.map((op, index) => `
        <div class="operation">
          <span>${escapeHTML(op.name)}</span>
          <b>${op.type === "income" ? "+" : "-"}${op.amount.toFixed(2)} €</b>
          <button class="delete-event" data-index="${index}">×</button>
        </div>
      `).join("") : "<p>Aucune opération enregistrée.</p>"}
    </div>
  `;

  document.getElementById("backHome").onclick = () => openPage("home");

  document.getElementById("budgetForm").onsubmit = event => {
    event.preventDefault();

    operations.push({
      name: document.getElementById("operationName").value.trim(),
      amount: Number(document.getElementById("operationAmount").value),
      type: document.getElementById("operationType").value
    });

    localStorage.setItem("lifeos_operations", JSON.stringify(operations));
    showBudget();
  };

  document.querySelectorAll(".delete-event").forEach(button => {
    button.onclick = () => {
      operations.splice(Number(button.dataset.index), 1);
      localStorage.setItem("lifeos_operations", JSON.stringify(operations));
      showBudget();
    };
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});



document.getElementById("notifications").onclick = () => {
  alert("Bienvenue dans LIFE OS !");
};

openPage("home");

/* =========================
   LIFE OS V2.2 - TACHES
========================= */

function getTasks() {
  return JSON.parse(localStorage.getItem("lifeos_tasks") || "[]");
}

function saveTasks(tasks) {
  localStorage.setItem("lifeos_tasks", JSON.stringify(tasks));
}

function addTask(name, date, priority) {
  const tasks = getTasks();

  tasks.push({
    id: Date.now(),
    name: name,
    date: date,
    priority: priority,
    done: false
  });

  saveTasks(tasks);
  showTasks();
}

function toggleTask(id) {
  const tasks = getTasks();

  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;

  saveTasks(tasks);
  showTasks();
}

function deleteTask(id) {
  const tasks = getTasks().filter(t => t.id !== id);

  saveTasks(tasks);
  showTasks();
}

function editTask(id) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);

  if (!task) return;

  const newName = prompt("Modifier le nom :", task.name);
  if (newName === null || !newName.trim()) return;

  const newDate = prompt(
    "Modifier la date (AAAA-MM-JJ) :",
    task.date || ""
  );
  if (newDate === null) return;

  const newPriority = prompt(
    "Priorité : normal, urgent ou low",
    task.priority
  );

  if (!["normal", "urgent", "low"].includes(newPriority)) {
    alert("Priorité incorrecte.");
    return;
  }

  task.name = newName.trim();
  task.date = newDate;
  task.priority = newPriority;

  saveTasks(tasks);
  showTasks();
}



function showTasks() {
  const tasks = getTasks();

  const completed = tasks.filter(t => t.done).length;
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  const now = new Date();
  const today =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");

  pageContent.innerHTML = `
    <div class="tasks-container">
      <h2>✅ Mes tâches</h2>

      <div class="tasks-progress">
        <p>${completed} / ${tasks.length} terminées</p>
        <div class="tasks-progress-bar">
          <div style="width:${progress}%"></div>
        </div>
        <strong>${progress}%</strong>
      </div>

      <div class="tasks-form">
        <input id="taskName" type="text"
          placeholder="Nouvelle tâche...">
        <input id="taskDate" type="date">

        <select id="taskPriority">
          <option value="normal">🟠 Normale</option>
          <option value="urgent">🔴 Urgente</option>
          <option value="low">🟢 Faible</option>
        </select>

        <button id="addTaskBtn">➕ Ajouter la tâche</button>
      </div>

      <div class="tasks-filter">
  <h3>FILTRER MES TÂCHES</h3>

  <div class="tasks-filter-grid">
    <button class="task-filter-btn selected" data-task-filter="all">
      <span>📋</span>
      <b>Toutes</b>
      <small>Toutes mes tâches</small>
    </button>

    <button class="task-filter-btn" data-task-filter="urgent">
      <span>🔴</span>
      <b>Urgentes</b>
      <small>Priorité élevée</small>
    </button>

    <button class="task-filter-btn" data-task-filter="today">
      <span>📅</span>
      <b>Aujourd'hui</b>
      <small>À faire ce jour</small>
    </button>

    <button class="task-filter-btn" data-task-filter="completed">
      <span>✅</span>
      <b>Terminées</b>
      <small>Tâches accomplies</small>
    </button>
  </div>
</div>

<div id="tasksList"></div>
    </div>
  `;
  document.getElementById("addTaskBtn").onclick = () => {
    const name = document.getElementById("taskName").value.trim();
    const date = document.getElementById("taskDate").value;
    const priority = document.getElementById("taskPriority").value;

    if (!name) {
      alert("Veuillez saisir une tâche.");
      return;
    }

    addTask(name, date, priority);
  };
  let activeFilter = "all";

function renderList() {
  const list = document.getElementById("tasksList");
  const filter = activeFilter;
let currentTasks = getTasks();

if (filter === "urgent") {
  currentTasks = currentTasks.filter(
    task => !task.done && task.priority === "urgent"
  );
}

if (filter === "today") {
  const now = new Date();
  const today =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");

  currentTasks = currentTasks.filter(
    task => !task.done && task.date === today
  );
}

if (filter === "completed") {
  currentTasks = currentTasks.filter(task => task.done);
}

    const sortedTasks = [...currentTasks].sort((a, b) => {
      function rank(task) {
        if (task.done) return 6;

        const overdue = task.date && task.date < today;
        const dueToday = task.date === today;

        if (task.priority === "urgent" && overdue) return 0;
        if (task.priority === "urgent") return 1;
        if (overdue) return 2;
        if (dueToday) return 3;
        if (task.date) return 4;

        return 5;
      }

      const rankDifference = rank(a) - rank(b);
      if (rankDifference !== 0) return rankDifference;

      if (a.date && b.date) {
        return a.date.localeCompare(b.date);
      }

      return 0;
    });

    if (!sortedTasks.length) {
      list.innerHTML = "<p>Aucune tâche pour le moment.</p>";
      return;
    }

    list.innerHTML = sortedTasks.map(task => {
      const name = task.name || "Tâche sans nom";
      const priority = task.priority || "normal";

      let status = "";

      if (task.done) {
        status = "✅ Terminée";
      } else if (task.date && task.date < today) {
        status = "⚠️ En retard";
      } else if (task.date === today) {
        status = "📅 À faire aujourd'hui";
      }

      return `
        <div class="task-card ${task.done ? "task-done" : ""}">
          <div class="task-info">
            <strong>${escapeHTML(name)}</strong>
            <p>${task.date || "Sans date limite"}</p>
            <span class="task-priority priority-${priority}">
              ${priority === "urgent" ? "🔴 Urgente" :
                priority === "low" ? "🟢 Faible" :
                "🟠 Normale"}
            </span>
            ${status ? `<p>${status}</p>` : ""}
          </div>

          <div class="task-actions">
            <button data-toggle-task="${task.id}">
              ${task.done ? "↩️ Reprendre" : "☑️ Terminer"}
            </button>

            <button data-delete-task="${task.id}">
              🗑️
            </button>

            <button data-edit-task="${task.id}">
              ✏️ Modifier
            </button>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-toggle-task]").forEach(btn => {
      btn.onclick = () => toggleTask(Number(btn.dataset.toggleTask));
    });

    list.querySelectorAll("[data-delete-task]").forEach(btn => {
      btn.onclick = () => deleteTask(Number(btn.dataset.deleteTask));
    });

    list.querySelectorAll("[data-edit-task]").forEach(btn => {
      btn.onclick = () => editTask(Number(btn.dataset.editTask));
    });
  }
  renderList();

document.querySelectorAll("[data-task-filter]").forEach(button => {
  button.onclick = () => {
    activeFilter = button.dataset.taskFilter;

    document.querySelectorAll("[data-task-filter]").forEach(item => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    renderList();
  };
});
}

// ===============================
// ASSISTANT VOCAL LIFE OS
// ===============================



document.addEventListener("DOMContentLoaded", () => {
  const bouton = document.getElementById("assistantBtn");

  if (bouton) {
    bouton.addEventListener("click", () => {
      parlerLifeOS(
        "Bonjour ! Je suis ton assistant LIFE OS. Je t'écoute.",
        ecouterLifeOS
      );
    });
  }
});


function ecouterLifeOS() {
  const Reconnaissance =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Reconnaissance) {
    alert("La reconnaissance vocale n'est pas disponible dans ce navigateur.");
    return;
  }

  const reconnaissance = new Reconnaissance();
  reconnaissance.lang = "fr-FR";
  reconnaissance.continuous = false;
  reconnaissance.interimResults = false;

  reconnaissance.onresult = function(event) {
    const commande = event.results[0][0].transcript.toLowerCase();

    parlerLifeOS("Tu as dit : " + commande);
  };

  reconnaissance.onerror = function() {
    parlerLifeOS("Je n'ai pas compris. Peux-tu répéter ?");
  };

  reconnaissance.start();
}

// CONNEXION DU BOUTON ASSISTANT

document.addEventListener("DOMContentLoaded", () => {
  const bouton = document.getElementById("assistantBtn");

  if (bouton) {
    bouton.addEventListener("click", () => {
      parlerLifeOS("Bonjour ! Je suis ton assistant LIFE OS. Que puis-je faire pour toi ?");
      ecouterLifeOS();
    });
  }
});



/* =================================
   LIFE OS - ASSISTANT VOCAL LIFE
================================= */

let lifeModeActif = false;
let lifeAttendCommande = false;
let lifeParle = false;
let lifeDemarre = false;
let lifeReconnaissance = null;

function lifeNormaliser(texte) {
  return texte.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function lifeDire(message, apresParole) {
  if (!("speechSynthesis" in window)) {
    alert("La voix est indisponible.");
    return;
  }

  lifeParle = true;

  if (lifeReconnaissance) {
    try {
      lifeReconnaissance.stop();
    } catch (error) {}
  }

  window.speechSynthesis.cancel();

  const voix = new SpeechSynthesisUtterance(message);
  voix.lang = "fr-FR";
  voix.volume = 1;

  voix.onend = function() {
    lifeParle = false;

    if (apresParole) {
      apresParole();
    } else {
      lifeDemarrerEcoute();
    }
  };

  window.speechSynthesis.speak(voix);
}





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

  // GESTION VOCALE DES TACHES

  } else if (
    /^ajoute(?:r)?\s+(?:une?\s+)?tache\b/.test(commande)
  ) {
    const nom = commande
      .replace(/^ajoute(?:r)?\s+(?:une?\s+)?tache\s*[:,-]?\s*/, "")
      .trim();

    if (!nom) {
      lifeDire("Quel nom veux-tu donner à cette tâche ?");
      return;
    }

    addTask(nom, "", "normal");
    lifeDire("J'ai ajouté la tâche : " + nom);

 
  } else if (
    /^(?:supprime|supprimer|enleve|retire)\s+(?:(?:la|ma|une)\s+)?tache\s+/.test(commande)
  ) {
    const nom = commande
      .replace(/^(?:supprime|supprimer|enleve|retire)\s+/, "")
      .replace(/^(?:la|ma|une)\s+tache\s+/, "")
      .replace(/^tache\s+/, "")
      .trim();

    const tasks = getTasks();

    const index = tasks.findIndex(task =>
      lifeNormaliser(task.name).trim() ===
      lifeNormaliser(nom).trim()
    );

    if (index === -1) {
      lifeDire("Je ne trouve pas cette tâche.");
    } else {
      const nomSupprime = tasks[index].name;
      tasks.splice(index, 1);
      saveTasks(tasks);
      openPage("tasks");
      lifeDire("J'ai supprimé la tâche " + nomSupprime);
    }

  } else if (
    /^(?:termine|terminer|acheve|achever|coche)\s+/.test(commande)
  ) {
    const nom = commande
      .replace(/^(?:termine|terminer|acheve|achever|coche)\s+/, "")
      .replace(/^(?:ma|la|une?)\s+tache\s+/, "")
      .replace(/^tache\s+/, "")
      .trim();

    const tasks = getTasks();

    const tache = tasks.find(task =>
      lifeNormaliser(task.name).trim() ===
      lifeNormaliser(nom).trim()
    );

    if (!tache) {
      lifeDire("Je ne trouve pas cette tâche.");
    } else {
      tache.done = true;
      saveTasks(tasks);
      openPage("tasks");
      lifeDire("La tâche " + tache.name + " est terminée.");
    }

    

  } else if (
    commande.includes("tache") &&
    (
      commande.includes("quelles") ||
      commande.includes("liste") ||
      commande.includes("affiche") ||
      commande.includes("mes taches")
    )
  ) {
    const tasks = getTasks();
    const restantes = tasks.filter(task => !task.done);

    openPage("tasks");

    if (restantes.length === 0) {
      lifeDire("Tu n'as aucune tâche en attente.");
    } else {
      const noms = restantes.map(task => task.name);
      lifeDire("Voici tes tâches : " + noms.join(". "));
    } 

  // MODIFIER UN RENDEZ-VOUS
  } else if (
    /^(?:deplace|deplacer|change|modifie)\s+(?:(?:mon|le|un)\s+)?(?:rendez-vous|rendez vous|rdv)\b/.test(commande)
  ) {
    const dateMot = commande.match(/\b(aujourd'hui|demain)\b/);

    const moisMatch = commande.match(
      /\b(?:le\s+)?(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/
    );

    const dateChiffres = commande.match(
      /\b(?:le\s+)?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/
    );

    if ((!dateMot && !moisMatch && !dateChiffres) || !heureMatch) {
      lifeDire("Précise la nouvelle date et la nouvelle heure.");
      return;
    }

    const maintenant = new Date();
    let nouvelleDate = new Date(maintenant);

    if (dateMot) {
      if (dateMot[1] === "demain") {
        nouvelleDate.setDate(nouvelleDate.getDate() + 1);
      }
    } else if (moisMatch) {
      const mois = [
        "janvier", "fevrier", "mars", "avril",
        "mai", "juin", "juillet", "aout",
        "septembre", "octobre", "novembre", "decembre"
      ];

      const jour = Number(moisMatch[1]);
      const numeroMois = mois.indexOf(moisMatch[2]);

      nouvelleDate = new Date(
        maintenant.getFullYear(),
        numeroMois,
        jour
      );

      if (
        nouvelleDate.getMonth() !== numeroMois ||
        nouvelleDate.getDate() !== jour
      ) {
        lifeDire("La nouvelle date n'est pas valide.");
        return;
      }

      if (
        nouvelleDate < new Date(
          maintenant.getFullYear(),
          maintenant.getMonth(),
          maintenant.getDate()
        )
      ) {
        nouvelleDate.setFullYear(nouvelleDate.getFullYear() + 1);
      }
    } else if (dateChiffres) {
      const jour = Number(dateChiffres[1]);
      const mois = Number(dateChiffres[2]);
      let annee = dateChiffres[3]
        ? Number(dateChiffres[3])
        : maintenant.getFullYear();

      if (annee < 100) annee += 2000;

      nouvelleDate = new Date(annee, mois - 1, jour);

      if (
        nouvelleDate.getFullYear() !== annee ||
        nouvelleDate.getMonth() !== mois - 1 ||
        nouvelleDate.getDate() !== jour
      ) {
        lifeDire("La nouvelle date n'est pas valide.");
        return;
      }

      if (!dateChiffres[3] && nouvelleDate < maintenant) {
        nouvelleDate.setFullYear(nouvelleDate.getFullYear() + 1);
      }
    }

    const heure = Number(heureMatch[1]);
    const minutes = Number(
      heureMatch[2] || heureMatch[3] || heureMatch[4] || 0
    );

    if (heure > 23 || minutes > 59) {
      lifeDire("La nouvelle heure n'est pas valide.");
      return;
    }

    const events = JSON.parse(
      localStorage.getItem("lifeos_events") || "[]"
    );

    const rendezVousFuturs = events
      .map((event, index) => ({ event, index }))
      .filter(item => {
        const dateEvent = new Date(
          item.event.date + "T" + (item.event.time || "00:00")
        );
        return dateEvent >= maintenant;
      });

    if (rendezVousFuturs.length === 0) {
      lifeDire("Je ne trouve aucun rendez-vous à venir dans ton agenda.");
      return;
    }

    if (rendezVousFuturs.length > 1) {
      lifeDire("Tu as plusieurs rendez-vous à venir. Précise lequel tu veux déplacer.");
      return;
    }

    const rendezVous = rendezVousFuturs[0].event;

    rendezVous.date = [
      nouvelleDate.getFullYear(),
      String(nouvelleDate.getMonth() + 1).padStart(2, "0"),
      String(nouvelleDate.getDate()).padStart(2, "0")
    ].join("-");

    rendezVous.time =
      String(heure).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0");

    events.sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );

    localStorage.setItem("lifeos_events", JSON.stringify(events));

    openPage("agenda");
    lifeDire(
      "Ton rendez-vous " + rendezVous.name +
      " a été déplacé au " +
      nouvelleDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long"
      }) +
      " à " + rendezVous.time.replace(":", " heures ") + "."
    );

    // SUPPRIMER UN RENDEZ-VOUS
  } else if (
    /^(?:supprime|enleve|retire)\s+.*(?:rendez-vous|rendez vous|evenement)\b/.test(commande)
  ) {
    const nomRecherche = commande
      .replace(/^(?:supprime|enleve|retire)\s+(?:(?:mon|le|un)\s+)?(?:rendez-vous|rendez vous|evenement)\s*/, "")
      .replace(/\b(chez|le|la|les|du|des|de|un|une|mon|ma|mes)\b/g, "")
      .trim()
      .replace(/\s+/g, " ");

    const events = JSON.parse(
      localStorage.getItem("lifeos_events") || "[]"
    );

    const nettoyerNom = nom =>
      lifeNormaliser(nom)
        .replace(/\b(chez|le|la|les|du|des|de|un|une|mon|ma|mes)\b/g, "")
        .trim()
        .replace(/\s+/g, " ");

    const correspondances = events
      .map((event, index) => ({ event, index }))
      .filter(item =>
        nettoyerNom(item.event.name) === nettoyerNom(nomRecherche)
      );

    if (correspondances.length === 0) {
      lifeDire("Je ne trouve pas ce rendez-vous dans ton agenda.");
    } else if (correspondances.length > 1) {
      lifeDire("J'ai trouvé plusieurs rendez-vous. Précise lequel tu veux supprimer.");
    } else {
      const index = correspondances[0].index;
      const rendezVous = events.splice(index, 1)[0];

      localStorage.setItem("lifeos_events", JSON.stringify(events));

      openPage("agenda");
      lifeDire("Ton rendez-vous " + rendezVous.name + " a été supprimé.");
    }

  // SUPPRIMER UN ARTICLE
  }   else if (
    (
      commande.includes("supprime") ||
      commande.includes("enleve") ||
      commande.includes("retire")
    ) &&
    !commande.includes("tache")
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

  // CONSULTER LES RENDEZ-VOUS
  } else if (
    commande.includes("aujourd hui") ||
    commande.includes("aujourd'hui") ||
    commande.includes("demain") ||
    commande.includes("prochain") ||
    commande.includes("rendez vous")
  ) {
    const events = JSON.parse(
      localStorage.getItem("lifeos_events") || "[]"
    );

    const maintenant = new Date();

    const dateDuJour = [
      maintenant.getFullYear(),
      String(maintenant.getMonth() + 1).padStart(2, "0"),
      String(maintenant.getDate()).padStart(2, "0")
    ].join("-");

    let selection = [];

    if (
      commande.includes("aujourd hui") ||
      commande.includes("aujourd'hui")
    ) {
      selection = events.filter(event => event.date === dateDuJour);
    } else if (commande.includes("demain")) {
      const demain = new Date(maintenant);
      demain.setDate(demain.getDate() + 1);

      const dateDemain = [
        demain.getFullYear(),
        String(demain.getMonth() + 1).padStart(2, "0"),
        String(demain.getDate()).padStart(2, "0")
      ].join("-");

      selection = events.filter(event => event.date === dateDemain);
    } else {
      selection = events.filter(event => {
        const dateEvent = new Date(
          event.date + "T" + (event.time || "00:00")
        );
        return dateEvent >= maintenant;
      });
    }

    selection.sort((a, b) =>
      (a.date + (a.time || "")).localeCompare(
        b.date + (b.time || "")
      )
    );

    if (selection.length === 0) {
      lifeDire("Tu n'as aucun rendez-vous prévu pour cette période.");
    } else {
      const reponses = selection.map(event => {
        const date = new Date(event.date + "T00:00:00")
          .toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long"
          });

        return event.name + ", le " + date +
          " à " + (event.time || "heure non précisée");
      });

      lifeDire("Voici ton planning : " + reponses.join(". "));
      openPage("agenda");
    }

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



function lifeDemarrerEcoute() {
  if (!lifeModeActif || lifeParle || lifeDemarre) {
    return;
  }

  const Reconnaissance =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Reconnaissance) {
    lifeModeActif = false;
    alert("La reconnaissance vocale est indisponible.");
    return;
  }

  const micro = new Reconnaissance();
  lifeReconnaissance = micro;

  micro.lang = "fr-FR";
  micro.continuous = false;
  micro.interimResults = false;

  
micro.onresult = function(event) {
  const phrase = lifeNormaliser(
    event.results[0][0].transcript
  );

  

  if (lifeAttendCommande) {
    lifeExecuter(phrase);
    return;
  }

  const position = phrase.indexOf("life");

  if (position !== -1) {
    const suite = phrase.slice(position + 4).trim();

    if (suite.length > 0) {
      lifeExecuter(suite);
    } else {
      lifeAttendCommande = true;
      lifeDire("Oui, je t'écoute.");
    }
  }
};

  micro.onerror = function(event) {
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      lifeModeActif = false;
      alert("Autorise le microphone dans Chrome.");
    }
  };

  micro.onend = function() {
    lifeDemarre = false;

    if (lifeReconnaissance === micro) {
      lifeReconnaissance = null;
    }

    if (lifeModeActif && !lifeParle) {
      setTimeout(lifeDemarrerEcoute, 800);
    }
  };

  try {
    lifeDemarre = true;
    micro.start();
  } catch (error) {
    lifeDemarre = false;
  }
}

// BOUTON ACTIVER / DÉSACTIVER
const boutonLife = document.getElementById("assistantBtn");

if (boutonLife) {
  boutonLife.addEventListener("click", function() {

    if (lifeModeActif) {
      lifeModeActif = false;
      lifeAttendCommande = false;

      if (lifeReconnaissance) {
        try {
          lifeReconnaissance.stop();
        } catch (error) {}
      }

      window.speechSynthesis.cancel();
      lifeParle = false;

      alert("Mode Life désactivé.");
      return;
    }

    lifeModeActif = true;
    lifeDire(
      "Mode Life activé. Dis simplement Life pour me parler."
    );
  });
}
