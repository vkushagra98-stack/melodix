import { useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

interface UseKeyboardShortcutsOptions {
  onToggleExpandedPlayer?: () => void;
}

export function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    cycleRepeatMode,
    isLyricsOpen,
    setIsLyricsOpen,
  } = useAudio();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keys if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        // Space: Toggle Play/Pause
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;

        // Right Arrow: Seek forward 5s (or Next Track with Shift)
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            playNext();
          } else {
            seekTo(Math.min(duration || 0, currentTime + 5));
          }
          break;

        // Left Arrow: Seek backward 5s (or Prev Track with Shift)
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            playPrevious();
          } else {
            seekTo(Math.max(0, currentTime - 5));
          }
          break;

        // Up Arrow: Volume Up 5%
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;

        // Down Arrow: Volume Down 5%
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;

        // M: Toggle Mute
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;

        // L: Toggle Lyrics
        case 'KeyL':
          e.preventDefault();
          setIsLyricsOpen(!isLyricsOpen);
          break;

        // F: Toggle Expanded Player
        case 'KeyF':
          e.preventDefault();
          if (options?.onToggleExpandedPlayer) {
            options.onToggleExpandedPlayer();
          }
          break;

        // S: Toggle Shuffle
        case 'KeyS':
          e.preventDefault();
          toggleShuffle();
          break;

        // R: Cycle Repeat Mode
        case 'KeyR':
          e.preventDefault();
          cycleRepeatMode();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLyricsOpen,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    cycleRepeatMode,
    setIsLyricsOpen,
    options,
  ]);
}
