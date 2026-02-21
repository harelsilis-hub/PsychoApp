import apiClient from './client';

export const reviewAPI = {
  getReviewSession: async (limit = 20) => {
    const response = await apiClient.get('/v1/review/session', { params: { limit } });
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

  getUnitWords: async (unit, limit = 50) => {
    const response = await apiClient.get(`/v1/review/unit/${unit}`, { params: { limit } });
    return response.data;
  },

  getFilterWords: async (unit) => {
    const response = await apiClient.get(`/v1/review/unit/${unit}/filter`);
    return response.data;
  },

  getLearnedWords: async (unit) => {
    const response = await apiClient.get(`/v1/review/unit/${unit}/learned`);
    return response.data;
  },
};
