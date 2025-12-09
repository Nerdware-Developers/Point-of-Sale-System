import axios from 'axios';
import offlineDB from '../utils/offlineDB.js';
import offlineSync from '../utils/offlineSync.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add token to requests if available (optional - authentication disabled)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Continue without token if authentication is disabled
  return config;
});

// Check if we're online
const isOnline = () => navigator.onLine;

// Response interceptor - handle offline responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || '';
    
    // NEVER handle login/auth requests offline - they must fail properly
    if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/')) {
      return Promise.reject(error);
    }
    
    // If offline and it's a network error, try to get from IndexedDB
    if (!isOnline() && (error.message === 'Network Error' || error.code === 'ERR_NETWORK')) {
      
      // Handle GET requests with local data
      if (error.config.method === 'get') {
        try {
          if (url.includes('/products')) {
            const products = await offlineDB.getProducts();
            return { data: products };
          }
          if (url.includes('/categories')) {
            const categories = await offlineDB.getCategories();
            return { data: categories };
          }
          if (url.includes('/customers')) {
            const customers = await offlineDB.getCustomers();
            return { data: customers };
          }
          if (url.includes('/sales')) {
            const sales = await offlineDB.getSales();
            return { data: sales };
          }
        } catch (dbError) {
          console.error('[API] Error reading from IndexedDB:', dbError);
        }
      }
      
      // For POST/PUT/DELETE, queue the operation
      if (['post', 'put', 'delete'].includes(error.config.method)) {
        const operationType = error.config.method.toUpperCase();
        const urlParts = error.config.url.split('/');
        const resource = urlParts[urlParts.length - 2];
        const id = urlParts[urlParts.length - 1];
        
        let type = `${operationType}_${resource.toUpperCase()}`;
        if (operationType === 'POST') {
          type = `CREATE_${resource.toUpperCase()}`;
        } else if (operationType === 'PUT') {
          type = `UPDATE_${resource.toUpperCase()}`;
        }
        
        await offlineSync.queueOperation(type, {
          ...error.config.data ? JSON.parse(error.config.data) : {},
          id: id !== resource ? id : undefined,
        });
        
        // Return a success response for queued operations
        return {
          data: {
            id: `local-${Date.now()}`,
            message: 'Operation queued for sync',
            offline: true,
          },
          status: 202,
        };
      }
      
      // Return offline error
      return Promise.reject({
        response: {
          data: {
            error: 'Offline',
            message: 'You are offline. Data will sync when connection is restored.',
            offline: true,
          },
          status: 503,
        },
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;

