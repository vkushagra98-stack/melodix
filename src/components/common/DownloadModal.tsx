import React, { useState } from 'react';
import { Download, Music, Video, X, Loader2, Check, Info } from 'lucide-react';
import type { Track } from '../../types/music';
import { downloadTrackWithMode } from '../../utils/downloader';

interface DownloadModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ track, isOpen, onClose }) => {
  const [mode, setMode] = useState<'audio' | 'video'>('audio');
  const [audioQuality, setAudioQuality] = useState<'320' | '160' | '96'>('320');
  const [videoQuality, setVideoQuality] = useState<'720' | '480' | '360'>('720');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!isOpen || !track) return null;

  const handleDownload = async () => {
    setStatus('loading');
    const selectedQuality = mode === 'audio' ? `${audioQuality}kbps` : `${videoQuality}p`;
    setMessage(`Preparing ${mode === 'audio' ? 'Studio Audio' : 'HD Video'} (${selectedQuality})...`);

    try {
      const qVal = mode === 'audio' ? audioQuality : videoQuality;
      const res = await downloadTrackWithMode(track, mode, qVal);
      
      if (res.success) {
        setStatus('success');

        if (mode === 'audio') {
          setMessage(`✓ Audio downloading! Saved to your Downloads folder.`);
          setTimeout(() => {
            setStatus('idle');
            onClose();
          }, 2400);
        } else {
          setMessage(`✓ HD Video downloading! Saved to your Downloads folder.`);
          setTimeout(() => {
            setStatus('idle');
            onClose();
          }, 2400);
        }
      } else {
        setStatus('error');
        setMessage(res.error || 'Unable to retrieve stream. Try another quality.');
        setTimeout(() => setStatus('idle'), 3500);
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          {track.artwork ? (
            <img 
              src={track.artwork} 
              alt={track.title} 
              className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" 
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
          )}
          <div className="min-w-0 pr-4">
            <h3 className="font-bold text-white text-sm truncate">{track.title}</h3>
            <p className="text-text-muted text-xs truncate mt-0.5">{track.artist}</p>
          </div>
        </div>

        {/* Status message */}
        {status !== 'idle' && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150
            ${status === 'loading' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : ''}
            ${status === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : ''}
            ${status === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : ''}
          `}>
            {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-400" />}
            {status === 'success' && <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
            <span className="leading-snug">{message}</span>
          </div>
        )}

        {/* Format Toggle: Audio vs Video */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/5 mb-4">
          <button
            type="button"
            onClick={() => setMode('audio')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'audio'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Audio (320kbps)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('video')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'video'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video (HD MP4)</span>
          </button>
        </div>

        {/* Audio Quality Selection */}
        {mode === 'audio' && (
          <div className="space-y-2 mb-5">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Audio Bitrate / Quality:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: '320', label: '320 kbps', desc: 'Studio Lossless' },
                { val: '160', label: '160 kbps', desc: 'High Quality' },
                { val: '96', label: '96 kbps', desc: 'Data Saver' },
              ].map((q) => (
                <button
                  key={q.val}
                  type="button"
                  onClick={() => setAudioQuality(q.val as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    audioQuality === q.val
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                      : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-bold">{q.label}</p>
                  <p className="text-[9px] opacity-70 mt-0.5">{q.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Video Quality Selection */}
        {mode === 'video' && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">
                Video Resolution:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: '720', label: '720p HD', desc: 'Crisp & Clear' },
                  { val: '480', label: '480p SD', desc: 'Standard' },
                  { val: '360', label: '360p Fast', desc: 'Small File' },
                ].map((q) => (
                  <button
                    key={q.val}
                    type="button"
                    onClick={() => setVideoQuality(q.val as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      videoQuality === q.val
                        ? 'bg-blue-500/20 border-blue-500 text-white shadow-sm'
                        : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold">{q.label}</p>
                    <p className="text-[9px] opacity-70 mt-0.5">{q.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Helper Tip */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] leading-relaxed">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>
                HD MP4 video downloads directly to your device without popups or redirects.
              </span>
            </div>
          </div>
        )}

        {/* Primary Download Action Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={status === 'loading'}
          className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            mode === 'audio'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20'
              : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/20'
          }`}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Preparing Download...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>
                {mode === 'audio'
                  ? `Download Studio Audio (${audioQuality} kbps)`
                  : `Download HD Video (${videoQuality}p)`}
              </span>
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-text-muted mt-3.5 opacity-60">
          Direct Device Download · No Subscription Needed
        </p>
      </div>
    </div>
  );
};

export default DownloadModal;
