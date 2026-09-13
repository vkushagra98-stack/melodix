import React from 'react';
import type { NavTab } from './Sidebar';
import { Home, Search, Library, Heart } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';

interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab }) => {
  const { likedTracks } = useAudio();

  const handleLikedClick = () => {
    onSelectTab('liked');
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="w-full h-14 bg-background-surface/95 backdrop-blur-xl border-t border-border px-2 flex items-center justify-around select-none shadow-lg"
    >
      <button
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
          currentTab === 'home' ? 'text-emerald-400 font-semibold' : 'text-text-muted hover:text-white'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Home</span>
      </button>

      <button
        onClick={() => onSelectTab('search')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
          currentTab === 'search' ? 'text-emerald-400 font-semibold' : 'text-text-muted hover:text-white'
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Search</span>
      </button>

      <button
        onClick={() => onSelectTab('library')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
          currentTab === 'library' ? 'text-emerald-400 font-semibold' : 'text-text-muted hover:text-white'
        }`}
      >
        <Library className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Library</span>
      </button>

      <button
        onClick={handleLikedClick}
        className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
          currentTab === 'liked' ? 'text-emerald-400 font-semibold' : 'text-text-muted hover:text-white'
        }`}
      >
        <Heart className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Liked</span>
        {likedTracks.length > 0 && (
          <span className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>
    </nav>
  );
};
