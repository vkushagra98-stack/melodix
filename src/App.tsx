import React, { useState } from 'react';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import type { NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { PlayerBar } from './components/player/PlayerBar';
import { ExpandedPlayer } from './components/player/ExpandedPlayer';
import { HomeView } from './components/home/HomeView';
import { SearchView } from './components/search/SearchView';
import { LibraryView } from './components/library/LibraryView';
import { PlaylistDetailView } from './components/playlist/PlaylistDetailView';
import { LyricsModal } from './components/lyrics/LyricsModal';
import { QueueDrawer } from './components/queue/QueueDrawer';
import { AiPlaylistModal } from './components/ai/AiPlaylistModal';
import { InstallModal } from './components/layout/InstallModal';
import { DeveloperApiView } from './components/developer/DeveloperApiView';
import { SettingsView } from './components/settings/SettingsView';
import { TermsModal } from './components/legal/TermsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { DownloadModal } from './components/common/DownloadModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import type { Playlist, SearchFilters } from './types/music';
import { X } from 'lucide-react';

const MainApp: React.FC = () => {
  const { 
    user, 
    isExpandedPlayerOpen, 
    setIsExpandedPlayerOpen, 
    openAuthModal,
    downloadModalTrack,
    closeDownloadModal 
  } = useAudio();
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isAiPlaylistOpen, setIsAiPlaylistOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isTermsReviewMode, setIsTermsReviewMode] = useState<boolean>(false);

  React.useEffect(() => {
    if (user) {
      const accepted = localStorage.getItem(`melodix_terms_${user.uid}`);
      if (!accepted) {
        setIsTermsModalOpen(true);
        setIsTermsReviewMode(false);
      }
    }
  }, [user]);

  const handleAcceptTerms = () => {
    if (user) {
      localStorage.setItem(`melodix_terms_${user.uid}`, 'true');
    }
    setIsTermsModalOpen(false);
  };

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    source: 'all',
  });

  // Enable global keyboard shortcuts (Spacebar, Arrows, Shift+Arrows, M, L, F, S, R)
  useKeyboardShortcuts({
    onToggleExpandedPlayer: () => setIsExpandedPlayerOpen(!isExpandedPlayerOpen),
  });

  React.useEffect(() => {
    const handleOpenInstall = () => setIsInstallModalOpen(true);
    window.addEventListener('open-install-modal', handleOpenInstall);
    return () => window.removeEventListener('open-install-modal', handleOpenInstall);
  }, []);

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      if (newFilters.query !== undefined && newFilters.query.trim().length > 0) {
        if (currentTab !== 'search') {
          setCurrentTab('search');
        }
      }
      return updated;
    });
  };

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setCurrentTab('playlist');
    setMobileMenuOpen(false);
  };

  const handleQuickSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, query }));
    setCurrentTab('search');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* Desktop Left Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          currentTab={currentTab}
          selectedPlaylist={selectedPlaylist}
          onSelectTab={handleSelectTab}
          onSelectPlaylist={handleSelectPlaylist}
          onOpenAiPlaylist={() => setIsAiPlaylistOpen(true)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex">
          <div className="w-72 h-full bg-background-surface shadow-2xl relative">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              currentTab={currentTab}
              selectedPlaylist={selectedPlaylist}
              onSelectTab={handleSelectTab}
              onSelectPlaylist={handleSelectPlaylist}
              onOpenAiPlaylist={() => {
                setMobileMenuOpen(false);
                setIsAiPlaylistOpen(true);
              }}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          filters={filters}
          onFilterChange={handleFilterChange}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAuthModal={() => openAuthModal('Sign in to sync your playlists and liked songs across devices!')}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto pb-36 md:pb-28">
          {currentTab === 'home' && (
            <HomeView
              onSelectPlaylist={handleSelectPlaylist}
              onQuickSearch={handleQuickSearch}
              onOpenAiPlaylist={() => setIsAiPlaylistOpen(true)}
            />
          )}

          {currentTab === 'search' && (
            <SearchView
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          )}

          {currentTab === 'library' && (
            <LibraryView
              initialTab="liked"
              onSelectPlaylist={handleSelectPlaylist}
              onOpenAiPlaylist={() => setIsAiPlaylistOpen(true)}
            />
          )}

          {currentTab === 'liked' && (
            <LibraryView
              initialTab="liked"
              onSelectPlaylist={handleSelectPlaylist}
              onOpenAiPlaylist={() => setIsAiPlaylistOpen(true)}
            />
          )}

          {currentTab === 'history' && (
            <LibraryView
              initialTab="history"
              onSelectPlaylist={handleSelectPlaylist}
              onOpenAiPlaylist={() => setIsAiPlaylistOpen(true)}
            />
          )}

          {currentTab === 'downloads' && (
            <LibraryView
              initialTab="downloads"
              onSelectPlaylist={handleSelectPlaylist}
              onOpenAiPlaylist={() => setIsAiPlaylistOpen(true)}
            />
          )}

          {currentTab === 'playlist' && selectedPlaylist && (
            <PlaylistDetailView
              playlist={selectedPlaylist}
              onBack={() => setCurrentTab('home')}
            />
          )}

          {currentTab === 'developer' && (
            <DeveloperApiView />
          )}

          {currentTab === 'settings' && (
            <SettingsView 
              onOpenTerms={() => {
                setIsTermsReviewMode(true);
                setIsTermsModalOpen(true);
              }} 
            />
          )}
        </main>

        {/* Bottom Audio Player Bar and Mobile Nav unified dock */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
          <div className="pointer-events-auto w-full">
            <PlayerBar 
              onExpand={() => setIsExpandedPlayerOpen(true)} 
            />
          </div>
          <div className="pointer-events-auto w-full md:hidden">
            <MobileNav
              currentTab={currentTab}
              onSelectTab={handleSelectTab}
            />
          </div>
        </div>

        {/* Expanded Player Overlay with Crash Protection */}
        {isExpandedPlayerOpen && (
          <ErrorBoundary fallback={<div />}>
            <ExpandedPlayer isOpen={isExpandedPlayerOpen} onClose={() => setIsExpandedPlayerOpen(false)} />
          </ErrorBoundary>
        )}

        {/* AI Playlist Studio Modal */}
        <AiPlaylistModal
          isOpen={isAiPlaylistOpen}
          onClose={() => setIsAiPlaylistOpen(false)}
          onPlaylistCreated={handleSelectPlaylist}
        />

        {/* Lyrics & Queue Modals */}
        <LyricsModal />
        <QueueDrawer />
        
        {/* Terms and Conditions Modal */}
        <TermsModal
          isOpen={isTermsModalOpen}
          isReviewMode={isTermsReviewMode}
          onAccept={handleAcceptTerms}
          onClose={() => setIsTermsModalOpen(false)}
        />
        
        {/* Install Modal */}
        <InstallModal 
          isOpen={isInstallModalOpen} 
          onClose={() => setIsInstallModalOpen(false)} 
        />

        {/* Global Download Quality Modal */}
        <DownloadModal
          track={downloadModalTrack}
          isOpen={!!downloadModalTrack}
          onClose={closeDownloadModal}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AudioProvider>
          <MainApp />
        </AudioProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
