import apiClient from './client';

export const customWordsAPI = {
  listWords: async () => {
    const response = await apiClient.get('/v1/my-words');
    return response.data;
  },

  createWord: async (englishWord, hebrewTranslation) => {
    const response = await apiClient.post('/v1/my-words', {
      english_word: englishWord,
      hebrew_translation: hebrewTranslation,
    });
    return response.data;
  },

  deleteWord: async (wordId) => {
    const response = await apiClient.delete(`/v1/my-words/${wordId}`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/v1/my-words/stats');
    return response.data;
  },

  getReviewWords: async () => {
    const response = await apiClient.get('/v1/my-words/review');
    return response.data;
  },

  getQuizWords: async () => {
    const response = await apiClient.get('/v1/my-words/quiz');
    return response.data;
  },

  submitReview: async (wordId, quality) => {
    const response = await apiClient.post('/v1/my-words/review/submit', {
      word_id: wordId,
      quality,
    });
    return response.data;
  },
};
