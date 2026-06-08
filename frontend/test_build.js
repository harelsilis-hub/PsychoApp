function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(words) {
  if (words.length === 0) return [];
  const pool = words.length >= 4 ? words : [...words, ...words, ...words, ...words];
  return shuffle([...words]).map((correct) => {
    const distractors = shuffle(
      pool.filter((w) => w.word_id !== correct.word_id && w.hebrew !== correct.hebrew)
    ).slice(0, 3);
    while (distractors.length < 3) {
      distractors.push({ word_id: -distractors.length, hebrew: '—' });
    }
    return {
      word_id: correct.word_id,
      english: correct.english,
      correct: correct.hebrew,
      options: shuffle([
        { hebrew: correct.hebrew, isCorrect: true },
        ...distractors.map((d) => ({ hebrew: d.hebrew, isCorrect: false })),
      ]),
    };
  });
}

console.log(buildQuestions([{word_id: 1, english: 'one', hebrew: '1'}]));
console.log(buildQuestions([{word_id: 1, english: 'one', hebrew: '1'}, {word_id: 2, english: 'two', hebrew: '2'}]));
