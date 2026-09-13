import React, { useRef, useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { Play, Pause, SkipForward, SkipBack, X, Maximize2, ExternalLink } from 'lucide-react';

interface FloatingMiniPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({ isOpen, onClose }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    playNext,
    playPrevious,
    setIsExpandedPlayerOpen,
  } = useAudio();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!currentTrack || !isOpen) return null;

  const handleTriggerPiP = async () => {
    try {
      if (!videoRef.current) {
        // Create an animated canvas stream for native Picture-in-Picture
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(currentTrack.title, 20, 200);
        }
        const stream = canvas.captureStream();
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        videoRef.current = video;
        await video.requestPictureInPicture();
      } else {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      }
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-24 right-6 z-40 w-72 bg-neutral-950/95 border border-emerald-500/30 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200 select-none">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Mini Player</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onClose();
              setIsExpandedPlayerOpen(true);
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white"
            title="Expand Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white"
            title="Close Mini Player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <img
          src={currentTrack.artwork}
          alt={currentTrack.title}
          className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
          <p className="text-[11px] text-text-secondary truncate mt-0.5">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Mini Progress */}
      <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Mini Controls */}
      <div className="flex items-center justify-between mt-2 pt-1">
        <button onClick={playPrevious} className="p-1 text-text-muted hover:text-white">
          <SkipBack className="w-4 h-4 fill-current" />
        </button>
        <button
          onClick={togglePlayPause}
          className="w-8 h-8 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
        <button onClick={playNext} className="p-1 text-text-muted hover:text-white">
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
