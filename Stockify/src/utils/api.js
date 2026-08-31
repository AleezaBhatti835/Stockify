const API_BASE_URL = 'http://localhost:5000';

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  }

  return res;
};