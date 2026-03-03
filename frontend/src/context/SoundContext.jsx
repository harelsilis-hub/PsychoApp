import { createContext, useContext } from 'react';
import useSounds from '../hooks/useSounds';

const SoundContext = createContext(null);

export const SoundProvider = ({ children }) => {
  const sounds = useSounds();
  return <SoundContext.Provider value={sounds}>{children}</SoundContext.Provider>;
};

export const useSound = () => useContext(SoundContext);
