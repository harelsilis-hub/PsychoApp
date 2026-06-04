import apiClient from './client';

export const systemAPI = {
  getSetting: async (key) => {
    const res = await apiClient.get(`/v1/system/settings/${key}`);
    return res.data;
  },
};
