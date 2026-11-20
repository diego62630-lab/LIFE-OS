
const app = document.getElementById("main-content");

async function startLifeOS() {
  await LIFE_DB.init();
  renderBudget();
}

async function renderBudget() {
  const entries = await LIFE_DB.getAll("budget");

  const income = entries
    .filter(x => x.type === "income")
    .reduce((sum, x) => sum + x.amount, 0);

  const expenses = entries
    .filter(x => x.type === "expense")
    .reduce((sum, x) => sum + x.amount, 0);

  const balance = income - expenses;

  app.innerHTML = `
    <section>
      <h2>💶 Mon budget</h2>
      <h3>Solde disponible</h3>
      <h1>${balance.toFixed(2)} €</h1>
      <p>Revenus : ${income.toFixed(2)} €</p>
      <p>Dépenses : ${expenses.toFixed(2)} €</p>
    </section>

    <section>
      <h2>Nouvelle opération</h2>
      <form id="budget-form">
        <select id="budget-type">
          <option value="income">Revenu</option>
          <option value="expense">Dépense</option>
        </select>

        <input id="budget-label"
          placeholder="Description"
          required>

        <input id="budget-amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Montant en euros"
          required>

        <button type="submit">Ajouter</button>
      </form>
    </section>

    <section>
      <h2>Historique</h2>
      <div id="budget-list"></div>
    </section>
  `;

  const list = document.getElementById("budget-list");

  entries.reverse().forEach(item => {
    const line = document.createElement("p");
    const sign = item.type === "income" ? "+" : "-";

    line.textContent =
      `${item.label} : ${sign}${item.amount.toFixed(2)} €`;

    const remove = document.createElement("button");
    remove.textContent = "Supprimer";

    remove.onclick = async () => {
      await LIFE_DB.remove("budget", item.id);
      renderBudget();
    };

    line.appendChild(remove);
    list.appendChild(line);
  });

  document.getElementById("budget-form")
    .addEventListener("submit", async event => {
      event.preventDefault();

      const amount = Number(
        document.getElementById("budget-amount").value
      );

      if (!Number.isFinite(amount) || amount <= 0) return;

      await LIFE_DB.add("budget", {
        type: document.getElementById("budget-type").value,
        label: document.getElementById("budget-label").value.trim(),
        amount
      });

      renderBudget();
    });
}

startLifeOS().catch(error => {
  console.error("Erreur LIFE-OS :", error);
  app.textContent = "Impossible de charger LIFE-OS.";
});
