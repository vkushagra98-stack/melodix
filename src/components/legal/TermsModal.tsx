import React from 'react';
import { Shield, Check, X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  isReviewMode?: boolean; // If true, it just shows terms, and 'Close' button
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onAccept, onClose, isReviewMode = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Terms and Conditions</h2>
              <p className="text-xs text-text-secondary">Please read our terms before using Melodix</p>
            </div>
          </div>
          {isReviewMode && onClose && (
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-text-secondary space-y-4 no-scrollbar">
          <p className="font-semibold text-white">Welcome to Melodix!</p>
          <p>By accessing or using the Melodix App, you agree to be bound by these Terms and Conditions.</p>
          
          <h3 className="text-white font-semibold mt-4">1. Acceptance of Terms</h3>
          <p>By creating an account, listening to music, or using our AI generation features, you agree to comply with all local and international copyright laws.</p>
          
          <h3 className="text-white font-semibold mt-4">2. User Content & Playlists</h3>
          <p>Any AI-generated playlists or user-created content belong to you, but we reserve the right to remove content that violates our community guidelines.</p>
          
          <h3 className="text-white font-semibold mt-4">3. Fair Use & Streaming</h3>
          <p>Melodix utilizes third-party APIs (including YouTube and JioSaavn) to provide high-quality audio streams. You agree not to abuse, mass-download, or reverse engineer the streaming endpoints provided by the application.</p>
          
          <h3 className="text-white font-semibold mt-4">4. Privacy Policy</h3>
          <p>Your listening history, liked songs, and preferences are saved securely to provide personalized recommendations. We do not sell your personal data to third parties.</p>

          <h3 className="text-white font-semibold mt-4">5. Modifications to the Service</h3>
          <p>We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice to you.</p>

          <p className="pt-4 text-xs italic opacity-70">Last Updated: September 2026</p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 shrink-0 flex justify-end gap-3">
          {isReviewMode ? (
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
            >
              Close
            </button>
          ) : (
            <>
              <button
                className="px-6 py-2.5 text-text-secondary hover:text-white transition-colors"
                onClick={() => alert('You must accept the terms to use Melodix.')}
              >
                Decline
              </button>
              <button
                onClick={onAccept}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                I Accept
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
