import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  Sparkles, 
  User, 
  ArrowRight, 
  Loader2, 
  Disc, 
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { firebaseAuth } from '../../services/firebaseAuth';
import type { UserProfile } from '../../types/music';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
  promptMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  promptMessage,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'email' | 'signup'>('google');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await firebaseAuth.signInWithGooglePopup();
      if (user) {
        if (onSuccess) onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setError(err?.message || 'Could not complete Google sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        await firebaseAuth.signUpWithEmail(email, password, userName);
      } else {
        await firebaseAuth.signInWithEmail(email, password);
      }
      
      const user = firebaseAuth.getUser();
      if (user) {
        if (onSuccess) onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign in. Please verify credentials.';
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (msg.includes('invalid-credential') || msg.includes('user-not-found')) {
        setError('Invalid email or password. You can also create an account with Sign Up.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none overflow-y-auto">
      {/* Background Ambient Lights (Fluid & Interactive & Highly Visible) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center mix-blend-screen">
        <div className="absolute w-[800px] h-[800px] bg-emerald-500/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute w-[700px] h-[700px] bg-purple-600/40 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <div className="absolute w-[600px] h-[600px] bg-teal-400/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s', animationDuration: '5s' }} />
      </div>

      <div className="relative w-full max-w-4xl bg-white/5 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-lg border border-white/10"
          title="Close (ESC)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: Redesigned Visualizer & Branding */}
        <div className="hidden md:flex md:col-span-5 bg-black/40 p-8 flex-col justify-between border-r border-white/10 relative overflow-hidden">
          
          <div className="relative z-10">
            {/* Melodix Brand */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 p-0.5 shadow-[0_0_30px_rgba(16,185,129,0.6)]">
                <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-300 drop-shadow-sm">
                  MELODIX
                </h2>
                <p className="text-[10px] text-emerald-400 font-extrabold tracking-[0.2em] uppercase">
                  Cloud Synchronized
                </p>
              </div>
            </div>

            {/* Redesigned Glowing Orb & Waveform (Modern) */}
            <div className="mt-16 mb-8 relative flex flex-col items-center justify-center">
              {/* Outer Glow */}
              <div className="absolute w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
              
              {/* Abstract Orb */}
              <div className="relative w-64 h-64 flex items-center justify-center preserve-3d">
                {/* Center Core: Quantum Core */}
                <div 
                  className="absolute z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-[0_0_80px_#10B981] preserve-3d"
                  style={{ animation: 'pulse-glow-core 3s ease-in-out infinite' }}
                >
                  <div className="w-8 h-8 bg-neutral-950 rounded-full flex items-center justify-center opacity-80 backdrop-blur-md">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  </div>
                </div>

                {/* Ring 1: Inner Wireframe Ring */}
                <div 
                  className="absolute w-24 h-24 rounded-full border border-emerald-500/50 preserve-3d shadow-[inset_0_0_15px_rgba(16,185,129,0.3)]"
                  style={{ animation: 'spin-3d 8s linear infinite' }}
                />

                {/* Ring 2: Secondary Wireframe Ring */}
                <div 
                  className="absolute w-36 h-36 rounded-full border border-teal-500/40 preserve-3d shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                  style={{ animation: 'spin-3d-reverse 12s linear infinite' }}
                />

                {/* Ring 3: Complex Geometric Polyhedron Base (Cube made of rings) */}
                <div 
                  className="absolute w-48 h-48 preserve-3d"
                  style={{ animation: 'spin-3d 20s linear infinite' }}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/20" style={{ transform: 'rotateX(90deg)' }} />
                  <div className="absolute inset-0 rounded-full border-2 border-teal-400/20" style={{ transform: 'rotateY(90deg)' }} />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" style={{ transform: 'rotateZ(90deg)' }} />
                  
                  {/* Orbiting Particles */}
                  <div className="absolute top-0 left-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_#10B981] -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-teal-400 rounded-full shadow-[0_0_10px_#14B8A6] -translate-x-1/2 translate-y-1/2" />
                  <div className="absolute top-1/2 left-0 w-2.5 h-2.5 bg-emerald-300 rounded-full shadow-[0_0_10px_#6EE7B7] -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_#FFF] translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              
              {/* Live Fluid Equalizer */}
              <div className="w-full mt-10 px-6 py-4 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wide">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span>Hi-Res Audio</span>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">
                    Lossless
                  </span>
                </div>

                <div className="flex items-end justify-between h-8 gap-1.5 px-1">
                  {[...Array(12)].map((_, i) => (
                    <span 
                      key={i} 
                      className={`w-1.5 rounded-t-full bg-gradient-to-t ${i % 2 === 0 ? 'from-emerald-400 to-teal-300' : 'from-purple-400 to-emerald-300'} animate-pulse`}
                      style={{ 
                        height: `${Math.random() * 60 + 40}%`, 
                        animationDuration: `${Math.random() * 0.8 + 0.4}s`,
                        animationDelay: `${Math.random() * 0.5}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Features */}
          <div className="space-y-3 pt-6 border-t border-white/10 relative z-10">
            <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>Real-Time Cloud Sync</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>AI Playlist Studio</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Sign In Form */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center relative bg-black/20">
          
          <div className="mb-8">
            <div className="flex md:hidden items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <span className="text-xl font-black tracking-widest text-white">MELODIX</span>
            </div>

            <h3 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
              {promptMessage ? 'Sign in to Melodix' : 'Welcome Back'}
            </h3>
            <p className="text-sm text-white/70 mt-2 font-medium">
              {promptMessage || 'Sign in to sync your playlists and liked songs across all devices.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-sm font-medium text-red-200 shadow-lg backdrop-blur-md">
              {error}
            </div>
          )}

          {/* Auth Mode Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 mb-8 backdrop-blur-md shadow-inner">
            <button
              type="button"
              onClick={() => {
                setAuthMode('google');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'google'
                  ? 'bg-white text-black shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'email' || authMode === 'signup'
                  ? 'bg-emerald-500 text-black shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
          </div>

          {/* Mode 1: Real Google Sign-In */}
          {authMode === 'google' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Continue with Google</h4>
                  <p className="text-white/60 text-sm mt-1">One-click secure login. No passwords required.</p>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-2xl bg-white hover:bg-gray-100 text-black text-sm font-extrabold transition-all shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Mode 2: Email & Password */}
          {(authMode === 'email' || authMode === 'signup') && (
            <form onSubmit={handleEmailAuth} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {authMode === 'signup' && (
                <div className="relative">
                  <User className="absolute left-4 top-4 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-colors shadow-inner"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-colors shadow-inner"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-white/40" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min. 6 characters)"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-colors shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 mt-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-extrabold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <>
                    <span>{authMode === 'signup' ? 'Create Free Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'signup' ? 'email' : 'signup');
                    setError(null);
                  }}
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition-colors"
                >
                  {authMode === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          )}

          {/* Guest Mode Option */}
          <div className="flex items-center justify-center text-sm pt-6 mt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="text-white/50 hover:text-white font-semibold cursor-pointer transition-colors"
            >
              Skip & Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
