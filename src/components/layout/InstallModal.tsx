import React, { useState, useEffect } from 'react';
import { X, MonitorSmartphone, Share, PlusSquare, Globe } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MonitorSmartphone className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Install Melodix App</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-text-secondary">
            Get the full native app experience with background play and faster loading. Install Melodix directly to your device!
          </p>

          <div className="space-y-4">
            {/* iOS Guide */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-xs">🍎</span>
                iOS (iPhone/iPad)
              </h3>
              <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside pl-1">
                <li>Open this site in <strong className="text-white">Safari</strong></li>
                <li>Tap the <Share className="w-3 h-3 inline mx-1 text-blue-400" /> <strong>Share</strong> button</li>
                <li>Scroll down and select <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3 h-3" /> Add to Home Screen</strong></li>
              </ol>
            </div>

            {/* Android Guide */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-xs">🤖</span>
                Android
              </h3>
              <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside pl-1">
                <li>Open this site in <strong className="text-white"><Globe className="w-3 h-3 inline mx-1" /> Chrome</strong></li>
                <li>Tap the <strong>Menu (⋮)</strong> at the top right</li>
                <li>Select <strong className="text-white">Install App</strong> or <strong>Add to Home Screen</strong></li>
              </ol>
            </div>

            {/* Desktop Guide */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-xs">💻</span>
                Desktop (Mac / Windows)
              </h3>
              <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside pl-1">
                <li>Open in <strong className="text-white">Chrome, Edge, or Brave</strong></li>
                <li>Look for the <strong>Install</strong> icon (looks like a monitor or download symbol) on the right side of your URL bar</li>
                <li>Click it and select <strong className="text-white">Install</strong></li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 border-t border-white/5 space-y-3">
          {deferredPrompt ? (
            <button
              onClick={handleNativeInstall}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <MonitorSmartphone className="w-5 h-5" />
              Install App Now
            </button>
          ) : null}
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 cursor-pointer ${
              deferredPrompt 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md'
            }`}
          >
            {deferredPrompt ? 'Cancel' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
};
