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

  getNextTriageWord: async () => {
    const response = await apiClient.get('/v1/progress/triage/next');
    return response.data;
  },

  getUnitStats: async () => {
    const response = await apiClient.get('/v1/progress/unit-stats');
    return response.data;
  },
};
