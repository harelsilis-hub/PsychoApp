import apiClient from './client';

export const customWordsAPI = {
  listWords: async (language = 'en') => {
    const response = await apiClient.get('/v1/my-words', { params: { language } });
    return response.data;
  },

  createWord: async (englishWord, hebrewTranslation, language = 'en') => {
    const response = await apiClient.post('/v1/my-words', {
      english_word: englishWord,
      hebrew_translation: hebrewTranslation,
      language,
    });
    return response.data;
  },

  deleteWord: async (wordId) => {
    const response = await apiClient.delete(`/v1/my-words/${wordId}`);
    return response.data;
  },

  getStats: async (language = 'en') => {
    const response = await apiClient.get('/v1/my-words/stats', { params: { language } });
    return response.data;
  },

  getReviewWords: async (language = 'en') => {
    const response = await apiClient.get('/v1/my-words/review', { params: { language } });
    return response.data;
  },

  getQuizWords: async (language = 'en') => {
    const response = await apiClient.get('/v1/my-words/quiz', { params: { language } });
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
