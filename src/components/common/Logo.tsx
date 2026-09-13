import React from 'react';
import { useAudio } from '../../context/AudioContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', onClick, className = '' }) => {
  const { isPlaying } = useAudio();

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div 
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`relative flex items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20 ${iconSizes[size]}`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className={`w-[65%] h-[65%] text-neutral-950 ${isPlaying ? 'animate-pulse' : ''}`}
        >
          <path d="M20 55 Q 35 20, 50 55 T 80 55" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className={`${textSizes[size]} font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70`}>
        Melodix.
      </span>
    </div>
  );
};
