import apiClient from './client';

export const authAPI = {
  register: async (email, password, displayName = null) => {
    const response = await apiClient.post('/v1/auth/register', {
      email,
      password,
      display_name: displayName || null,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post('/v1/auth/login', { email, password });
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get('/v1/auth/me');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post('/v1/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await apiClient.post('/v1/auth/reset-password', { token, password });
    return response.data;
  },
};
