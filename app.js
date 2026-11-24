
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

function openPage(name) {
  if (!pages[name]) return;

  document.querySelector("main > .welcome").style.display =
    name === "home" ? "flex" : "none";

  document.querySelector("main > h2").style.display =
    name === "home" ? "block" : "none";

  document.querySelector(".modules").style.display =
    name === "home" ? "grid" : "none";

  document.querySelector(".summary").style.display =
    name === "home" ? "block" : "none";

  if (name === "budget") {
    showBudget();
  } else if (name === "agenda") {
    showAgenda();
  } else if (name === "tasks") {
    showTasks();
  } else {
    pageContent.innerHTML = `
      <h2>${pages[name][0]}</h2>
      <p>${pages[name][1]}</p>
    `;
  }

  if (name === "home") {
    updateHomeDashboard();
  }

  pageContent.style.display =
    name === "home" ? "none" : "block";

  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === name
    );
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
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

document.getElementById("assistantBtn").onclick = () => openPage("assistant");

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


/* ===============================
   ASSISTANT VOCAL LIFE OS
================================ */

let reconnaissanceLifeOS = null;


function parlerLifeOS(message, apresParole) {
  if (!window.speechSynthesis) {
    alert("Synthèse vocale indisponible.");
    return;
  }

  // Arrêter toute écoute en cours
  if (reconnaissanceLifeOS) {
    try {
      reconnaissanceLifeOS.abort();
    } catch (error) {}
    reconnaissanceLifeOS = null;
  }

  window.speechSynthesis.cancel();

  const voix = new SpeechSynthesisUtterance(message);
  voix.lang = "fr-FR";
  voix.rate = 1;
  voix.pitch = 1;

  voix.onend = () => {
    // Attendre un petit instant avant d'activer le micro
    if (typeof apresParole === "function") {
      setTimeout(apresParole, 700);
    }
  };

  window.speechSynthesis.speak(voix);
}

function ecouterLifeOS() {
  const Reconnaissance =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Reconnaissance) {
    parlerLifeOS("La reconnaissance vocale est indisponible.");
    return;
  }

  reconnaissanceLifeOS = new Reconnaissance();
  reconnaissanceLifeOS.lang = "fr-FR";
  reconnaissanceLifeOS.continuous = false;
  reconnaissanceLifeOS.interimResults = false;

  reconnaissanceLifeOS.onresult = function(event) {
    const commande = event.results[0][0].transcript
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (commande.includes("agenda")) {
      openPage("agenda");
      parlerLifeOS("J'ouvre ton agenda.");
    } else if (commande.includes("budget")) {
      openPage("budget");
      parlerLifeOS("J'ouvre ton budget.");
    } else if (
      commande.includes("tache") ||
      commande.includes("taches")
    ) {
      openPage("tasks");
      parlerLifeOS("J'affiche tes tâches.");
    } else if (
      commande.includes("accueil") ||
      commande.includes("maison")
    ) {
      openPage("home");
      parlerLifeOS("Retour à l'accueil.");
    } else if (commande.includes("date")) {
      const aujourdHui = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      parlerLifeOS("Aujourd'hui, nous sommes le " + aujourdHui);
    } else {
      parlerLifeOS("Je n'ai pas compris ta commande. Réessaie.");
    }
  };

  reconnaissanceLifeOS.onerror = function() {
    parlerLifeOS("Je n'ai pas réussi à comprendre.");
  };

  try {
    reconnaissanceLifeOS.start();
  } catch (error) {
    parlerLifeOS("Le microphone n'a pas pu démarrer.");
  }
}

const assistantBtn = document.getElementById("assistantBtn");

if (assistantBtn) {
  assistantBtn.addEventListener("click", () => {
    parlerLifeOS(
      "Bonjour ! Je suis ton assistant LIFE OS. Dis-moi ce que tu souhaites ouvrir.",
      ecouterLifeOS
    );
  });
}
