import apiClient from './client';

export const wordsAPI = {
  getSentenceCompletion: async (limit = 10, language = 'en') => {
    const response = await apiClient.get('/v1/words/sentence-completion', { params: { limit, language } });
    return response.data;
  },
  submitSentenceCompletion: async (wordId, isCorrect) => {
    const response = await apiClient.post('/v1/words/sentence-completion/submit', {
      word_id: wordId,
      is_correct: isCorrect,
    });
    return response.data;
  },
};
