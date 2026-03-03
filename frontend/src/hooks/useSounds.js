import { useCallback, useRef, useState } from 'react';

const STORAGE_KEY = 'mila_sounds_enabled';

const useSounds = () => {
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== 'false'
  );
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback((frequency, duration, gain = 0.25, offset = 0) => {
    if (!soundEnabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + offset);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + offset);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + offset + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + duration);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + duration + 0.02);
    } catch { /* ignore AudioContext errors */ }
  }, [soundEnabled, getCtx]);

  // Pleasant two-note chime — correct answer
  const playCorrect = useCallback(() => {
    playTone(523, 0.13, 0.22, 0);     // C5
    playTone(659, 0.20, 0.18, 0.11);  // E5
  }, [playTone]);

  // Soft low tone — wrong answer
  const playWrong = useCallback(() => {
    playTone(280, 0.28, 0.18, 0);
  }, [playTone]);

  // Slightly different soft tone — don't know
  const playDontKnow = useCallback(() => {
    playTone(260, 0.22, 0.15, 0);
  }, [playTone]);

  // Subtle tick — FilterMode know swipe
  const playTick = useCallback(() => {
    playTone(700, 0.06, 0.12, 0);
  }, [playTone]);

  // TTS pronunciation of a word
  const speakWord = useCallback((word, lang = 'en-US') => {
    if (!soundEnabled) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = 0.85;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  return { soundEnabled, toggleSound, playCorrect, playWrong, playDontKnow, playTick, speakWord };
};

export default useSounds;
