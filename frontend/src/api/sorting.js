import apiClient from './client';

export const sortingAPI = {
  startPlacementTest: async () => {
    const response = await apiClient.post('/v1/sorting/start');
    return response.data;
  },

  submitAnswer: async (isKnown) => {
    const response = await apiClient.post('/v1/sorting/answer', { is_known: isKnown });
    return response.data;
  },

  getSession: async () => {
    const response = await apiClient.get('/v1/sorting/session');
    return response.data;
  },
};

export default sortingAPI;
