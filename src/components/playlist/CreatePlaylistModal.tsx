import React, { useState } from 'react';
import { X, Lock, Globe, Plus, Sparkles, Image as ImageIcon } from 'lucide-react';
import { storage } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import type { Playlist } from '../../types/music';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (playlist: Playlist) => void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedCover, setSelectedCover] = useState(PRESET_COVERS[0]);
  const [customCover, setCustomCover] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cover = customCover.trim() || selectedCover;
    const newPlaylist = storage.createPlaylist(title, description, isPrivate, cover);
    onCreated(newPlaylist);
    showToast(`Playlist "${newPlaylist.title}" created successfully!`);
    setTitle('');
    setDescription('');
    setCustomCover('');
    setIsPrivate(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md bg-background-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-background-card/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Create New Playlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Playlist Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Late Night Bollywood, Phonk Drive, Coke Studio Hits"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background-card border border-white/10 focus:border-emerald-500/50 text-sm text-white placeholder:text-text-muted focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a vibe description..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-background-card border border-white/10 focus:border-emerald-500/50 text-sm text-white placeholder:text-text-muted focus:outline-none resize-none"
            />
          </div>

          {/* Privacy Switch (Public vs Private) */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Privacy Setting
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  !isPrivate
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50'
                    : 'bg-background-card text-text-secondary border-white/5 hover:border-white/15'
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Public Playlist</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  isPrivate
                    ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/50'
                    : 'bg-background-card text-text-secondary border-white/5 hover:border-white/15'
                }`}
              >
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Private (Only You)</span>
              </button>
            </div>
          </div>

          {/* Cover Image Presets */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Select Cover Artwork
            </label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {PRESET_COVERS.map((c, i) => (
                <button
                  key={`cover-${i}`}
                  type="button"
                  onClick={() => {
                    setSelectedCover(c);
                    setCustomCover('');
                  }}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedCover === c && !customCover
                      ? 'border-emerald-400 scale-105 shadow-md'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={c} alt="Cover preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-text-muted shrink-0" />
              <input
                type="url"
                value={customCover}
                onChange={(e) => setCustomCover(e.target.value)}
                placeholder="Or paste custom image URL..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-background-card border border-white/5 text-xs text-white placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create Playlist</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
