import apiClient from './client';

export const leaderboardAPI = {
  getLeaderboard: async (type = 'alltime', limit = 20) => {
    const response = await apiClient.get(`/v1/leaderboard?type=${type}&limit=${limit}`);
    return response.data;
  },

  getMyBadges: async () => {
    const response = await apiClient.get('/v1/leaderboard/me/badges');
    return response.data;
  },
};
