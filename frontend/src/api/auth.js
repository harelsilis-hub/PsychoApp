import apiClient from './client';

export const authAPI = {
  register: async (email, password) => {
    const response = await apiClient.post('/v1/auth/register', { email, password });
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post('/v1/auth/login', { email, password });
    return response.data;
  },
};
