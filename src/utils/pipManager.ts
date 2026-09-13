/**
 * Modern Document Picture-in-Picture & Floating Mini-Player Manager
 * Directly creates an Always-On-Top desktop floating window that stays visible
 * even when switching tabs, minimizing Chrome, or using other Windows apps (Images 3 & 4).
 */
import type { Track } from '../types/music';

let pipWindow: Window | null = null;
let currentCallbacks: {
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
} | null = null;

export function isPiPSupported(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

export function isPiPActive(): boolean {
  return pipWindow !== null && !pipWindow.closed;
}

export async function toggleDocumentPiP(
  track: Track | null,
  isPlaying: boolean,
  currentTime: number,
  duration: number,
  callbacks: {
    togglePlayPause: () => void;
    playNext: () => void;
    playPrevious: () => void;
  }
) {
  if (!track) return;

  currentCallbacks = callbacks;

  if (isPiPActive()) {
    pipWindow?.close();
    pipWindow = null;
    return;
  }

  if (isPiPSupported()) {
    try {
      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 330,
        height: 380,
      });

      pipWindow = pip;

      // Inject clean CSS
      const style = pip.document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #0e0f12;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          padding: 16px;
          justify-content: space-between;
        }
        .artwork-container {
          width: 100%;
          aspect-ratio: 1 / 1;
          max-height: 220px;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0,0,0,0.7);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .artwork {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .meta {
          margin-top: 10px;
          min-width: 0;
        }
        .title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .artist {
          font-size: 13px;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 3px;
        }
        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.15);
          border-radius: 2px;
          margin-top: 12px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #10b981;
          border-radius: 2px;
          transition: width 0.25s linear;
        }
        .controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          margin-top: 12px;
          padding-bottom: 4px;
        }
        .btn {
          background: none;
          border: none;
          color: #d4d4d8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.15s;
        }
        .btn:hover {
          color: #ffffff;
          background: rgba(255,255,255,0.12);
        }
        .play-btn {
          width: 46px;
          height: 46px;
          background: #10b981;
          color: #09090b;
          border-radius: 50%;
        }
        .play-btn:hover {
          background: #34d399;
          transform: scale(1.06);
        }
        .play-btn:active {
          transform: scale(0.95);
        }
      `;
      pip.document.head.appendChild(style);

      const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

      pip.document.body.innerHTML = `
        <div class="artwork-container">
          <img id="pip-art" class="artwork" src="${track.artwork}" alt="${track.title}" />
        </div>
        <div class="meta">
          <div id="pip-title" class="title">${track.title}</div>
          <div id="pip-artist" class="artist">${track.artist}</div>
          <div class="progress-bar">
            <div id="pip-progress" class="progress-fill" style="width: ${progressPct}%"></div>
          </div>
        </div>
        <div class="controls">
          <button id="pip-prev" class="btn" title="Previous">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button id="pip-play" class="btn play-btn" title="Play/Pause">
            <svg id="pip-play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              ${isPlaying 
                ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' 
                : '<path d="M8 5v14l11-7z"/>'}
            </svg>
          </button>
          <button id="pip-next" class="btn" title="Next">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>
      `;

      pip.document.getElementById('pip-prev')?.addEventListener('click', () => {
        currentCallbacks?.playPrevious();
      });
      pip.document.getElementById('pip-next')?.addEventListener('click', () => {
        currentCallbacks?.playNext();
      });
      pip.document.getElementById('pip-play')?.addEventListener('click', () => {
        currentCallbacks?.togglePlayPause();
      });

      pip.addEventListener('pagehide', () => {
        pipWindow = null;
      });
    } catch (err) {
      console.warn('[PiP] Failed to open Document PiP window:', err);
    }
  }
}

export function updateDocumentPiPState(
  track: Track | null,
  isPlaying: boolean,
  currentTime: number,
  duration: number
) {
  if (!pipWindow || pipWindow.closed || !track) return;

  try {
    const art = pipWindow.document.getElementById('pip-art') as HTMLImageElement;
    if (art && art.src !== track.artwork) {
      art.src = track.artwork;
    }

    const title = pipWindow.document.getElementById('pip-title');
    if (title && title.textContent !== track.title) {
      title.textContent = track.title;
    }

    const artist = pipWindow.document.getElementById('pip-artist');
    if (artist && artist.textContent !== track.artist) {
      artist.textContent = track.artist;
    }

    const progress = pipWindow.document.getElementById('pip-progress');
    if (progress && duration > 0) {
      const pct = Math.min(100, (currentTime / duration) * 100);
      progress.style.width = `${pct}%`;
    }

    const playIcon = pipWindow.document.getElementById('pip-play-icon');
    if (playIcon) {
      playIcon.innerHTML = isPlaying 
        ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' 
        : '<path d="M8 5v14l11-7z"/>';
    }
  } catch {}
}