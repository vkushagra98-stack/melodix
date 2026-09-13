import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Menu, LogIn, LogOut, Wand2, Sparkles, Mic, MicOff } from 'lucide-react';
import type { SearchFilters, UserProfile } from '../../types/music';
import { firebaseAuth } from '../../services/firebaseAuth';
import { storage } from '../../utils/storage';

interface HeaderProps {
  filters: SearchFilters;
  onFilterChange: (newFilters: Partial<SearchFilters>) => void;
  onSearchSubmit?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenAuthModal?: () => void;
  onOpenAiPlaylist?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  onFilterChange,
  onSearchSubmit,
  onOpenMobileMenu,
  onOpenAuthModal,
  onOpenAiPlaylist,
}) => {
  const [user, setUser] = useState<UserProfile | null>(() => firebaseAuth.getUser());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filters.query.trim()) {
        storage.addSearchQuery(filters.query.trim());
      }
      if (onSearchSubmit) {
        onSearchSubmit();
      }
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Voice search is supported in Chrome, Edge, and modern mobile browsers.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onFilterChange({ query: transcript });
          storage.addSearchQuery(transcript.trim());
          if (onSearchSubmit) {
            onSearchSubmit();
          }
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSignOut = async () => {
    await firebaseAuth.signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between gap-3 md:gap-4 border-b border-border bg-background-surface/80 backdrop-blur-md sticky top-0 z-20">
      {/* Left side: Mobile burger + Search bar + AI DJ Button */}
      <div className="flex items-center gap-2.5 md:gap-3 flex-1 max-w-2xl">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={filters.query}
            onChange={(e) => onFilterChange({ query: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening... Speak now!"
                : isMobile
                  ? "Search songs, artists..."
                  : "Search Hindi, English, Phonk, Coke Studio, or Artists..."
            }
            className={`w-full pl-10 pr-20 py-2 rounded-xl bg-background-card border text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all ${
              isListening
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/20'
                : 'border-white/5 focus:border-emerald-500/50 focus:bg-background-cardHover'
            }`}
          />

          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
            {/* Clear Button */}
            {filters.query && (
              <button
                onClick={() => onFilterChange({ query: '' })}
                className="p-1 rounded-md text-text-muted hover:text-white transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Voice Search Microphone Button */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              title={isListening ? "Listening... Click to cancel" : "Voice Search — Speak song or artist name"}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                  : 'text-text-muted hover:text-emerald-400 hover:bg-white/5'
              }`}
              aria-label="Voice search"
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* AI DJ Button right next to search */}
        {onOpenAiPlaylist && (
          <button
            onClick={onOpenAiPlaylist}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-purple-200 text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
            title="Create Custom Mixes with AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
            <span>AI DJ</span>
          </button>
        )}
        
        {/* Install App Button in Header (visible on mobile too) */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-install-modal'))}
          className="flex sm:hidden items-center justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
          title="Install Melodix App"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
      </div>

      {/* Right side: Google Profile / Sign-In Button */}
      <div className="flex items-center gap-2 shrink-0">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full border border-emerald-500/30 hover:border-emerald-500 transition-all bg-emerald-950/20 cursor-pointer"
              title={user.displayName || user.email || 'User Profile'}
            >
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.email || 'User')}&backgroundColor=8b5cf6,ec4899&textColor=ffffff`}
                alt={user.displayName || 'Profile'}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.email || 'User')}&backgroundColor=8b5cf6,ec4899&textColor=ffffff`;
                }}
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-background-surface border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-xs font-bold text-white truncate">{user.displayName || 'Melodix User'}</p>
                  <p className="text-[11px] text-text-muted truncate">{user.email || 'Cloud Synced'}</p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Firebase Cloud Sync Active</span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Sign in with Google / Email to sync playlists & liked songs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
