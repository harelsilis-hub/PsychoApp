import apiClient from './client';

export const authAPI = {
  register: async (email, password, displayName = null, referralCode = null) => {
    const response = await apiClient.post('/v1/auth/register', {
      email,
      password,
      display_name: displayName || null,
      referral_code: referralCode || null,
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

  googleAuth: async (credential, referralCode = null) => {
    const response = await apiClient.post('/v1/auth/google', { credential, referral_code: referralCode || null });
    return response.data;
  },

  getReferralStats: async () => {
    const response = await apiClient.get('/v1/auth/referral-stats');
    return response.data;
  },
};
