import apiClient from './client';

/**
 * Sorting Hat API endpoints for adaptive placement test
 */
export const sortingAPI = {
  /**
   * Start a new placement test session
   * @param {number} userId - User ID
   * @returns {Promise} Session data with first word
   */
  startPlacementTest: async (userId) => {
    const response = await apiClient.post('/v1/sorting/start', { user_id: userId });
    return response.data;
  },

  /**
   * Submit an answer to the current placement question
   * @param {number} userId - User ID
   * @param {boolean} isKnown - Whether the user knows the word
   * @returns {Promise} Updated session with next word or completion status
   */
  submitAnswer: async (userId, isKnown) => {
    const response = await apiClient.post(`/v1/sorting/answer?user_id=${userId}`, {
      is_known: isKnown,
    });
    return response.data;
  },

  /**
   * Get the active placement session for a user
   * @param {number} userId - User ID
   * @returns {Promise} Active session data
   */
  getSession: async (userId) => {
    const response = await apiClient.get(`/v1/sorting/session/${userId}`);
    return response.data;
  },
};

export default sortingAPI;
