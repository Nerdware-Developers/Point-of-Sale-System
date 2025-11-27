// IndexedDB wrapper for offline storage
class OfflineDB {
  constructor() {
    this.dbName = 'POSOfflineDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: false });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('category_id', 'category_id', { unique: false });
        }

        // Sales store
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('sale_id', 'sale_id', { unique: true });
          salesStore.createIndex('date_time', 'date_time', { unique: false });
          salesStore.createIndex('synced', 'synced', { unique: false });
        }

        // Pending operations store (for syncing)
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });
          pendingStore.createIndex('type', 'type', { unique: false });
          pendingStore.createIndex('synced', 'synced', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id', autoIncrement: false });
        }

        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id', autoIncrement: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Generic CRUD operations
  async add(storeName, data) {
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return store.add(data);
  }

  async put(storeName, data) {
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return store.put(data);
  }

  async get(storeName, key) {
    const tx = this.db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    return store.get(key);
  }

  async getAll(storeName) {
    const tx = this.db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    return store.getAll();
  }

  async delete(storeName, key) {
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return store.delete(key);
  }

  // Products operations
  async saveProducts(products) {
    const tx = this.db.transaction(['products'], 'readwrite');
    const store = tx.objectStore('products');
    await Promise.all(products.map(product => store.put(product)));
  }

  async getProducts() {
    return this.getAll('products');
  }

  async getProductById(id) {
    return this.get('products', id);
  }

  async getProductByBarcode(barcode) {
    const tx = this.db.transaction(['products'], 'readonly');
    const store = tx.objectStore('products');
    const index = store.index('barcode');
    return index.get(barcode);
  }

  // Sales operations
  async saveSale(sale, synced = false) {
    const saleData = {
      ...sale,
      synced,
      local_id: sale.id || `local-${Date.now()}-${Math.random()}`,
      created_at: new Date().toISOString(),
    };
    return this.add('sales', saleData);
  }

  async getSales() {
    return this.getAll('sales');
  }

  async getUnsyncedSales() {
    const tx = this.db.transaction(['sales'], 'readonly');
    const store = tx.objectStore('sales');
    const index = store.index('synced');
    return index.getAll(false);
  }

  async markSaleSynced(saleId) {
    const sale = await this.get('sales', saleId);
    if (sale) {
      sale.synced = true;
      return this.put('sales', sale);
    }
  }

  // Pending operations (for syncing)
  async addPendingOperation(operation) {
    const op = {
      ...operation,
      synced: false,
      timestamp: new Date().toISOString(),
    };
    return this.add('pendingOperations', op);
  }

  async getPendingOperations() {
    const tx = this.db.transaction(['pendingOperations'], 'readonly');
    const store = tx.objectStore('pendingOperations');
    const index = store.index('synced');
    return index.getAll(false);
  }

  async markOperationSynced(operationId) {
    const op = await this.get('pendingOperations', operationId);
    if (op) {
      op.synced = true;
      return this.put('pendingOperations', op);
    }
  }

  // Categories
  async saveCategories(categories) {
    const tx = this.db.transaction(['categories'], 'readwrite');
    const store = tx.objectStore('categories');
    await Promise.all(categories.map(cat => store.put(cat)));
  }

  async getCategories() {
    return this.getAll('categories');
  }

  // Customers
  async saveCustomers(customers) {
    const tx = this.db.transaction(['customers'], 'readwrite');
    const store = tx.objectStore('customers');
    await Promise.all(customers.map(customer => store.put(customer)));
  }

  async getCustomers() {
    return this.getAll('customers');
  }

  // Settings
  async saveSetting(key, value) {
    return this.put('settings', { key, value });
  }

  async getSetting(key) {
    const setting = await this.get('settings', key);
    return setting ? setting.value : null;
  }
}

export default new OfflineDB();


