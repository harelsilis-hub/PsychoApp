import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../context/SoundContext';

const SoundToggle = ({ className = '' }) => {
  const { soundEnabled, toggleSound } = useSound();
  return (
    <button
      onClick={toggleSound}
      title={soundEnabled ? 'כבה צלילים' : 'הפעל צלילים'}
      className={`flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors ${className}`}
    >
      {soundEnabled
        ? <Volume2 className="w-4 h-4" />
        : <VolumeX className="w-4 h-4 text-gray-300" />}
    </button>
  );
};

export default SoundToggle;
