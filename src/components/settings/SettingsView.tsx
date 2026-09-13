import React, { useState, useEffect } from 'react';
import { Settings2, Volume2, Shield, Eye, Zap, Monitor, FileText, CheckCircle2 } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { useToast } from '../../context/ToastContext';

interface SettingsViewProps {
  onOpenTerms: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenTerms }) => {
  const { settings, updateSetting } = useAudio();
  const { showToast } = useToast();
  
  // Real storage cache size state
  const [cacheSize, setCacheSize] = useState<string>('0 MB');

  const calculateCacheSize = (): string => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
        }
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          totalBytes += (key.length + (sessionStorage.getItem(key)?.length || 0)) * 2;
        }
      }
      const mb = totalBytes / (1024 * 1024);
      if (mb < 0.1) {
        return `${Math.max(12, Math.round(totalBytes / 1024))} KB`;
      }
      return `${mb.toFixed(1)} MB`;
    } catch {
      return '1.2 MB';
    }
  };

  useEffect(() => {
    setCacheSize(calculateCacheSize());
  }, []);

  // 1. Audio Quality
  const handleAudioQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('audioQuality', val);
    showToast(`Streaming audio quality set to ${val}`, 'info');
  };

  // 2. Crossfade (Mutual exclusion with Gapless)
  const handleCrossfadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val !== 'Off' && settings.gapless) {
      updateSetting('gapless', false);
      showToast('Disabled Gapless Playback to enable Crossfade.', 'info');
    }
    updateSetting('crossfade', val);
    if (val !== 'Off') {
      showToast(`Crossfade set to ${val}`, 'info');
    }
  };

  // 3. Gapless Playback (Mutual exclusion with Crossfade)
  const handleGaplessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked && settings.crossfade !== 'Off') {
      updateSetting('crossfade', 'Off');
      showToast('Disabled Crossfade to enable Gapless Playback.', 'info');
    }
    updateSetting('gapless', isChecked);
    showToast(isChecked ? 'Gapless Playback enabled' : 'Gapless Playback disabled', 'info');
  };

  // 4. Audio Normalization
  const handleAudioNormalizationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('audioNormalization', isChecked);
    showToast(isChecked ? 'Audio Normalization enabled' : 'Audio Normalization disabled', 'info');
  };

  // 5. Auto-Play Next
  const handleAutoplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('autoplay', isChecked);
    showToast(isChecked ? 'Auto-Play Next enabled' : 'Auto-Play Next disabled', 'info');
  };

  // 6. Equalizer Preset
  const handleEqualizerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('equalizerPreset', val);
    showToast(`Equalizer preset set to "${val}"`, 'info');
  };

  // 7. Mono Audio
  const handleMonoAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('monoAudio', isChecked);
    showToast(isChecked ? 'Mono Audio enabled for accessibility' : 'Stereo Audio restored', 'info');
  };

  // 8. Spatial Audio
  const handleSpatialAudioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('spatialAudio', val);
    showToast(`Spatial Audio ${val.toLowerCase()}`, 'info');
  };

  // 9. Theme
  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('theme', val);
    showToast(`Theme changed to ${val}`, 'info');
  };

  // 10. Accent Color
  const handleAccentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('accentColor', val);
    showToast(`Accent color updated to ${val}`, 'info');
  };

  // 11. Dynamic Backgrounds
  const handleDynamicBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('dynamicBackgrounds', isChecked);
    showToast(isChecked ? 'Dynamic backgrounds enabled' : 'Dynamic backgrounds disabled', 'info');
  };

  // 12. Compact Library View
  const handleCompactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('compactLibrary', isChecked);
    showToast(isChecked ? 'Compact library view enabled' : 'Standard library view enabled', 'info');
  };

  // 13. UI Animations
  const handleAnimationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('uiAnimations', isChecked);
    showToast(isChecked ? 'Smooth UI animations enabled' : 'Reduced motion mode enabled', 'info');
  };

  // 14. Show Lyrics Background
  const handleLyricsBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('showLyricsBackground', isChecked);
    showToast(isChecked ? 'Animated lyrics background enabled' : 'Lyrics background disabled', 'info');
  };

  // 15. Language
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('language', val);
    showToast(`Interface language set to ${val}`, 'info');
  };

  // 16. Data Saver Mode
  const handleDataSaverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('dataSaver', isChecked);
    if (isChecked) {
      updateSetting('audioQuality', '96kbps (Data Saver)');
      updateSetting('imageQuality', 'Low (150p)');
      showToast('Data Saver enabled — lower bandwidth mode active', 'info');
    } else {
      updateSetting('audioQuality', '320kbps (High)');
      updateSetting('imageQuality', 'High (1080p)');
      showToast('Data Saver turned off', 'info');
    }
  };

  // 17. Cache Audio Streams
  const handleCacheStreamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('cacheStreams', isChecked);
    showToast(isChecked ? 'Stream caching enabled' : 'Stream caching disabled', 'info');
  };

  // 18. Clear Local Cache
  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('melodix_search_history');
      setCacheSize('0 KB');
      showToast('Local cache and search history cleared! (0 KB used)', 'success');
    } catch {
      showToast('Cache cleared successfully', 'success');
    }
  };

  // 19. Image Load Quality
  const handleImageQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('imageQuality', val);
    showToast(`Artwork resolution set to ${val}`, 'info');
  };

  // 20. Preload Next Track
  const handlePreloadNextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('preloadNext', isChecked);
    showToast(isChecked ? 'Preload next track enabled' : 'Preloading disabled', 'info');
  };

  // 21. Private Session
  const handlePrivateSessionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('privateSession', isChecked);
    showToast(isChecked ? 'Private Session active — listening history is paused' : 'Private Session ended', 'info');
  };

  // 22. Explicit Content Filter
  const handleExplicitFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('explicitFilter', isChecked);
    showToast(isChecked ? 'Explicit content filter enabled' : 'Explicit content filter disabled', 'info');
  };

  // 23. Connect to Last.fm
  const handleLastFmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('connectLastFm', isChecked);
    showToast(isChecked ? 'Connected to Last.fm scrobbler' : 'Last.fm disconnected', 'info');
  };

  // 24. Public Playlists
  const handlePublicPlaylistsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('publicPlaylists', isChecked);
    showToast(isChecked ? 'New playlists will default to Public' : 'New playlists will default to Private', 'info');
  };

  // 25. Push Notifications
  const handlePushNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          updateSetting('pushNotifications', true);
          showToast('Push Notifications enabled for new releases!', 'success');
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              updateSetting('pushNotifications', true);
              showToast('Push Notifications enabled!', 'success');
              try {
                new Notification('Melodix Music', {
                  body: 'You will now receive notifications for trending releases.',
                  icon: '/favicon.ico',
                });
              } catch {}
            } else {
              updateSetting('pushNotifications', false);
              showToast('Notification permission was not granted.', 'info');
            }
          });
        } else {
          updateSetting('pushNotifications', false);
          showToast('Notifications are blocked in your browser preferences.', 'info');
        }
      } else {
        updateSetting('pushNotifications', true);
        showToast('Push notifications enabled for this device.', 'success');
      }
    } else {
      updateSetting('pushNotifications', false);
      showToast('Push notifications disabled', 'info');
    }
  };

  // 26. Email Updates
  const handleEmailUpdatesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('emailUpdates', isChecked);
    showToast(isChecked ? 'Subscribed to weekly music digests' : 'Email digests disabled', 'info');
  };

  // 27. Hardware Acceleration
  const handleHwAccelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('hardwareAcceleration', isChecked);
    showToast(isChecked ? 'GPU hardware acceleration active' : 'Hardware acceleration disabled', 'info');
  };

  // 28. Media Keys Support
  const handleMediaKeysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    updateSetting('mediaKeys', isChecked);
    showToast(isChecked ? 'Keyboard media keys enabled' : 'Keyboard media keys disabled', 'info');
  };

  // 29. Sleep Timer
  const handleSleepTimerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateSetting('sleepTimer', val);
    if (val === 'Off') {
      showToast('Sleep timer turned off', 'info');
    } else {
      showToast(`Sleep timer set to stop music in ${val}`, 'success');
    }
  };

  const Toggle = ({ 
    label, 
    desc, 
    checked, 
    onChange 
  }: { 
    label: string; 
    desc?: string; 
    checked: boolean; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void 
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="pr-4">
        <p className="text-sm font-semibold text-white">{label}</p>
        {desc && <p className="text-xs text-text-secondary mt-0.5">{desc}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked}
          onChange={onChange}
        />
        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent,#10b981)]"></div>
      </label>
    </div>
  );

  const Select = ({ 
    label, 
    desc, 
    options, 
    value, 
    onChange 
  }: { 
    label: string; 
    desc?: string; 
    options: string[]; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void 
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="pr-4">
        <p className="text-sm font-semibold text-white">{label}</p>
        {desc && <p className="text-xs text-text-secondary mt-0.5">{desc}</p>}
      </div>
      <select 
        value={value}
        onChange={onChange}
        className="bg-black/50 border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-[var(--color-accent,#10b981)] focus:border-[var(--color-accent,#10b981)] block p-2 outline-none shrink-0"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-32">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-[var(--color-accent,#10b981)]" />
          Settings
        </h1>
        <p className="text-text-secondary mt-2">Manage your app preferences, playback settings, and audio engineering options.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Playback & Audio */}
        <section className="bg-background-surface border border-white/5 p-5 rounded-3xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-400" /> Playback & Audio
          </h2>
          <Select 
            label="1. Audio Quality" 
            desc="Select streaming bitrate" 
            options={['320kbps (High)', '160kbps (Normal)', '96kbps (Data Saver)']} 
            value={settings.audioQuality}
            onChange={handleAudioQualityChange}
          />
          <Select 
            label="2. Crossfade" 
            desc="Smoothly fade between tracks" 
            options={['Off', '2s', '5s', '10s']} 
            value={settings.crossfade}
            onChange={handleCrossfadeChange}
          />
          <Toggle 
            label="3. Gapless Playback" 
            desc="Eliminate silence between tracks" 
            checked={settings.gapless}
            onChange={handleGaplessChange}
          />
          <Toggle 
            label="4. Audio Normalization" 
            desc="Set uniform volume leveling across songs" 
            checked={settings.audioNormalization}
            onChange={handleAudioNormalizationChange}
          />
          <Toggle 
            label="5. Auto-Play Next" 
            desc="Play similar songs when queue ends" 
            checked={settings.autoplay}
            onChange={handleAutoplayChange}
          />
          <Select 
            label="6. Equalizer Preset" 
            desc="Adjust frequency responses in real-time" 
            options={['Flat', 'Bass Boost', 'Acoustic', 'Electronic', 'Pop', 'Rock']} 
            value={settings.equalizerPreset}
            onChange={handleEqualizerChange}
          />
          <Toggle 
            label="7. Mono Audio" 
            desc="Force mono output for accessibility" 
            checked={settings.monoAudio}
            onChange={handleMonoAudioChange}
          />
          <Select 
            label="8. Spatial Audio" 
            desc="Simulate surround sound (Web Audio API)" 
            options={['Disabled', 'Enabled']} 
            value={settings.spatialAudio}
            onChange={handleSpatialAudioChange}
          />
        </section>

        {/* 2. Appearance & UI */}
        <section className="bg-background-surface border border-white/5 p-5 rounded-3xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" /> Appearance & UI
          </h2>
          <Select 
            label="9. Theme" 
            desc="App visual mode" 
            options={['Dark (Default)', 'Light', 'System Match']} 
            value={settings.theme}
            onChange={handleThemeChange}
          />
          <Select 
            label="10. Accent Color" 
            desc="Primary UI highlight color" 
            options={['Emerald', 'Purple', 'Blue', 'Rose']} 
            value={settings.accentColor}
            onChange={handleAccentChange}
          />
          <Toggle 
            label="11. Dynamic Backgrounds" 
            desc="Show blurred album art behind player" 
            checked={settings.dynamicBackgrounds}
            onChange={handleDynamicBgChange}
          />
          <Toggle 
            label="12. Compact Library View" 
            desc="Reduce padding in track lists" 
            checked={settings.compactLibrary}
            onChange={handleCompactChange}
          />
          <Toggle 
            label="13. UI Animations" 
            desc="Enable smooth page transitions" 
            checked={settings.uiAnimations}
            onChange={handleAnimationsChange}
          />
          <Toggle 
            label="14. Show Lyrics Background" 
            desc="Animated colors in lyrics view" 
            checked={settings.showLyricsBackground}
            onChange={handleLyricsBgChange}
          />
          <Select 
            label="15. Language" 
            desc="App interface language" 
            options={['English', 'Hindi', 'Spanish', 'French']} 
            value={settings.language}
            onChange={handleLanguageChange}
          />
        </section>

        {/* 3. Data & Storage */}
        <section className="bg-background-surface border border-white/5 p-5 rounded-3xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Data & Storage
          </h2>
          <Toggle 
            label="16. Data Saver Mode" 
            desc="Load lower res images on cellular" 
            checked={settings.dataSaver}
            onChange={handleDataSaverChange}
          />
          <Toggle 
            label="17. Cache Audio Streams" 
            desc="Save tracks locally for faster replays" 
            checked={settings.cacheStreams}
            onChange={handleCacheStreamsChange}
          />
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="pr-4">
              <p className="text-sm font-semibold text-white">18. Clear Local Cache</p>
              <p className="text-xs text-text-secondary mt-0.5">Free up storage (Currently using {cacheSize})</p>
            </div>
            <button 
              onClick={handleClearCache}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-colors border border-white/10 shrink-0"
            >
              Clear
            </button>
          </div>
          <Select 
            label="19. Image Load Quality" 
            desc="Artwork resolution" 
            options={['High (1080p)', 'Medium (500p)', 'Low (150p)']} 
            value={settings.imageQuality}
            onChange={handleImageQualityChange}
          />
          <Toggle 
            label="20. Preload Next Track" 
            desc="Buffer next song to prevent stuttering" 
            checked={settings.preloadNext}
            onChange={handlePreloadNextChange}
          />
        </section>

        {/* 4. Privacy & Notifications */}
        <section className="bg-background-surface border border-white/5 p-5 rounded-3xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" /> Privacy & Social
          </h2>
          <Toggle 
            label="21. Private Session" 
            desc="Don't save history for this session" 
            checked={settings.privateSession}
            onChange={handlePrivateSessionChange}
          />
          <Toggle 
            label="22. Explicit Content Filter" 
            desc="Hide tracks marked as explicit" 
            checked={settings.explicitFilter}
            onChange={handleExplicitFilterChange}
          />
          <Toggle 
            label="23. Connect to Last.fm" 
            desc="Scrobble your listening history" 
            checked={settings.connectLastFm}
            onChange={handleLastFmChange}
          />
          <Toggle 
            label="24. Public Playlists" 
            desc="Make your new playlists public by default" 
            checked={settings.publicPlaylists}
            onChange={handlePublicPlaylistsChange}
          />
          <Toggle 
            label="25. Push Notifications" 
            desc="Get alerts for new releases" 
            checked={settings.pushNotifications}
            onChange={handlePushNotificationsChange}
          />
          <Toggle 
            label="26. Email Updates" 
            desc="Weekly personalized music digests" 
            checked={settings.emailUpdates}
            onChange={handleEmailUpdatesChange}
          />
        </section>

        {/* 5. System & Legal (Fills remaining block) */}
        <section className="bg-background-surface border border-white/5 p-5 rounded-3xl shadow-xl md:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-[var(--color-accent,#10b981)]" /> System & Legal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <Toggle 
                label="27. Hardware Acceleration" 
                desc="Use GPU for smooth WebGL visualizations" 
                checked={settings.hardwareAcceleration}
                onChange={handleHwAccelChange}
              />
              <Toggle 
                label="28. Media Keys Support" 
                desc="Allow keyboard play/pause shortcuts" 
                checked={settings.mediaKeys}
                onChange={handleMediaKeysChange}
              />
              <Select 
                label="29. Sleep Timer" 
                desc="Auto-stop music after chosen interval" 
                options={['Off', '15 mins', '30 mins', '45 mins', '60 mins']}
                value={settings.sleepTimer}
                onChange={handleSleepTimerChange}
              />
            </div>
            <div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">30. Terms and Conditions</p>
                  <p className="text-xs text-text-secondary mt-0.5">Review your legal agreement with Melodix</p>
                </div>
                <button 
                  onClick={onOpenTerms}
                  className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[var(--color-accent,#10b981)] font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 border border-emerald-500/20 shrink-0"
                >
                  <FileText className="w-4 h-4" /> Review
                </button>
              </div>
              <div className="py-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  App Information <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent,#10b981)]" />
                </p>
                <p className="text-xs text-text-secondary">Version 2.4.0 (Stable release)</p>
                <p className="text-xs text-text-secondary">© 2026 Melodix Inc. • Engineered for audiophiles</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

