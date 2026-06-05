import apiClient from './client';

export const pollsAPI = {
  getActivePoll: async () => {
    const res = await apiClient.get('/v1/polls/active');
    return res.data;
  },

  vote: async (pollId, optionIndex) => {
    const res = await apiClient.post(`/v1/polls/${pollId}/vote`, { option_index: optionIndex });
    return res.data;
  },
};
