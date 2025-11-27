import offlineDB from './offlineDB.js';
import api from '../services/api';

class OfflineSync {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync();
      this.dispatchEvent('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.dispatchEvent('offline');
    });
  }

  dispatchEvent(type) {
    window.dispatchEvent(new CustomEvent('connectionchange', { detail: { isOnline: this.isOnline } }));
  }

  async sync() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log('[OfflineSync] Starting sync...');

    try {
      // Sync unsynced sales
      await this.syncSales();

      // Sync pending operations
      await this.syncPendingOperations();

      // Sync local data with server
      await this.syncLocalData();

      console.log('[OfflineSync] Sync completed');
    } catch (error) {
      console.error('[OfflineSync] Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncSales() {
    const unsyncedSales = await offlineDB.getUnsyncedSales();
    
    for (const sale of unsyncedSales) {
      try {
        // Remove local_id before sending
        const { local_id, synced, ...saleData } = sale;
        
        const response = await api.post('/sales', saleData);
        
        // Mark as synced
        await offlineDB.markSaleSynced(sale.id);
        
        console.log('[OfflineSync] Synced sale:', sale.sale_id || local_id);
      } catch (error) {
        console.error('[OfflineSync] Failed to sync sale:', error);
        // Keep it for next sync attempt
      }
    }
  }

  async syncPendingOperations() {
    const pendingOps = await offlineDB.getPendingOperations();
    
    for (const op of pendingOps) {
      try {
        let response;
        
        switch (op.type) {
          case 'CREATE_PRODUCT':
            response = await api.post('/products', op.data);
            break;
          case 'UPDATE_PRODUCT':
            response = await api.put(`/products/${op.data.id}`, op.data);
            break;
          case 'DELETE_PRODUCT':
            response = await api.delete(`/products/${op.data.id}`);
            break;
          case 'CREATE_CUSTOMER':
            response = await api.post('/customers', op.data);
            break;
          case 'UPDATE_CUSTOMER':
            response = await api.put(`/customers/${op.data.id}`, op.data);
            break;
          default:
            console.warn('[OfflineSync] Unknown operation type:', op.type);
            continue;
        }
        
        await offlineDB.markOperationSynced(op.id);
        console.log('[OfflineSync] Synced operation:', op.type);
      } catch (error) {
        console.error('[OfflineSync] Failed to sync operation:', error);
      }
    }
  }

  async syncLocalData() {
    try {
      // Fetch latest data from server and update local cache
      const [productsRes, categoriesRes, customersRes] = await Promise.all([
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/customers').catch(() => ({ data: [] })),
      ]);

      await Promise.all([
        offlineDB.saveProducts(productsRes.data),
        offlineDB.saveCategories(categoriesRes.data),
        offlineDB.saveCustomers(customersRes.data),
      ]);

      console.log('[OfflineSync] Local data synced');
    } catch (error) {
      console.error('[OfflineSync] Failed to sync local data:', error);
    }
  }

  async queueOperation(type, data) {
    await offlineDB.addPendingOperation({ type, data });
    console.log('[OfflineSync] Operation queued:', type);
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.sync();
    }
  }
}

export default new OfflineSync();


