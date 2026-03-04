import apiClient from './client';

export const reviewAPI = {
  getReviewSession: async (limit = 20, language = 'en') => {
    const response = await apiClient.get('/v1/review/session', { params: { limit, language } });
    return response.data;
  },

  submitReview: async (wordId, quality) => {
    const response = await apiClient.post('/v1/review/submit', {
      word_id: wordId,
      quality,
    });
    return response.data;
  },

  getReviewStats: async () => {
    const response = await apiClient.get('/v1/review/stats');
    return response.data;
  },

  getUnitWords: async (unit, limit = 50, language = 'en') => {
    const response = await apiClient.get(`/v1/review/unit/${unit}`, { params: { limit, language } });
    return response.data;
  },

  getFilterWords: async (unit, language = 'en') => {
    const response = await apiClient.get(`/v1/review/unit/${unit}/filter`, { params: { language, limit: 500 } });
    return response.data;
  },

  getLearnedWords: async (unit, language = 'en') => {
    const response = await apiClient.get(`/v1/review/unit/${unit}/learned`, { params: { language } });
    return response.data;
  },

  getAllLearningWords: async (language = 'en') => {
    const response = await apiClient.get('/v1/review/learning/all', { params: { language } });
    return response.data;
  },

  getAllLearnedWords: async (language = 'en') => {
    const response = await apiClient.get('/v1/review/learned/all', { params: { language } });
    return response.data;
  },

  flagWord: async (wordId) => {
    const response = await apiClient.post(`/v1/admin/flag/${wordId}`);
    return response.data;
  },
};
