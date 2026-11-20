
const LIFE_DB = {
  name: "LIFE_OS_DATABASE",
  version: 1,
  db: null,

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        this.name,
        this.version
      );

      request.onupgradeneeded = event => {
        const db = event.target.result;

        const stores = [
          "budget",
          "tasks",
          "events",
          "goals",
          "notes"
        ];

        stores.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, {
              keyPath: "id",
              autoIncrement: true
            });
          }
        });
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  },

  add(store, data) {
    return this.transaction(store, "readwrite", os =>
      os.add({
        ...data,
        createdAt: new Date().toISOString()
      })
    );
  },

  getAll(store) {
    return this.transaction(store, "readonly", os =>
      os.getAll()
    );
  },

  remove(store, id) {
    return this.transaction(store, "readwrite", os =>
      os.delete(id)
    );
  },

  transaction(store, mode, action) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Base de données non initialisée"));
        return;
      }

      const tx = this.db.transaction(store, mode);
      const request = action(tx.objectStore(store));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};

window.LIFE_DB = LIFE_DB;
