import apiClient from './client';

export const progressAPI = {
  triageWord: async (wordId, isKnown) => {
    const response = await apiClient.post('/v1/progress/triage', {
      word_id: wordId,
      is_known: isKnown,
    });
    return response.data;
  },

  getUserStats: async () => {
    const response = await apiClient.get('/v1/progress/stats');
    return response.data;
  },

  getBatchTriageWords: async (limit = 50, language = 'en') => {
    const response = await apiClient.get(`/v1/progress/triage/batch?limit=${limit}&language=${language}`);
    return response.data;
  },

  getUnitStats: async (language = 'en') => {
    const response = await apiClient.get(`/v1/progress/unit-stats?language=${language}`);
    return response.data;
  },

  resetUnitProgress: async (unitNumber, language = 'en') => {
    const response = await apiClient.delete(`/v1/progress/unit/${unitNumber}/reset?language=${language}`);
    return response.data;
  },
};
