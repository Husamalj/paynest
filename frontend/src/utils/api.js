import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// AUTO LOGOUT
function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  localStorage.removeItem('paynest_logged_in');
  localStorage.removeItem('paynest_employee_id');

  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.error ||
      error.message ||
      'Request failed';

    console.error('API Error:', status, message);

    // TOKEN EXPIRED / INVALID
    if (status === 401) {
      logoutUser();
      return Promise.reject(
        new Error('Session expired. Please login again.')
      );
    }

    // COMPANY DISABLED / FORBIDDEN
    if (status === 403) {
      if (
        message.toLowerCase().includes('inactive') ||
        message.toLowerCase().includes('forbidden')
      ) {
        logoutUser();
      }

      return Promise.reject(new Error(message));
    }

    return Promise.reject(new Error(message));
  }
);

export default api;