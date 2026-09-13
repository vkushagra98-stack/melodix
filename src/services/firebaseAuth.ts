import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signOut,
  onAuthStateChanged,
  type Auth
} from 'firebase/auth';
import type { UserProfile, Track, Playlist } from '../types/music';
import { storage } from '../utils/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB-QcMZ3YxMFtGNltkFtRCyF_zpFLglRyI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'frameflow-ai-937f5.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://frameflow-ai-937f5-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'frameflow-ai-937f5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'frameflow-ai-937f5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '446857733070',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:446857733070:web:ca7d7082d090033747c19f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-5V52JT8C3Y'
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('your_firebase_api_key')) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  }
} catch (e) {
  console.warn('[FirebaseAuth] Firebase initialization failed, running in guest mode:', e);
}

export interface FirebaseUserData {
  likedTracks?: Track[];
  playlists?: Playlist[];
  history?: Track[];
  searchHistory?: string[];
  apiKeys?: any[];
  lastUpdated?: string;
}

class FirebaseAuthService {
  private user: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];

  constructor() {
    this.user = storage.getUserProfile();
    if (auth) {
      try {
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            this.user = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`,
            };
            storage.saveUserProfile(this.user);
            this.notify();
            await this.syncFromCloud().catch(() => {});
          } else {
            this.user = null;
            storage.saveUserProfile(null);
            this.notify();
          }
        });
      } catch (err) {
        console.warn('[FirebaseAuth] onAuthStateChanged error:', err);
      }
    }
  }

  public getUser(): UserProfile | null {
    return this.user;
  }

  public onAuthStateChanged(cb: (user: UserProfile | null) => void) {
    this.listeners.push(cb);
    cb(this.user);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public notify() {
    this.listeners.forEach((cb) => cb(this.user));
  }

  public async signInWithGooglePopup(): Promise<UserProfile> {
    if (!auth || !googleProvider) {
      throw new Error('Authentication is currently not configured or unavailable.');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`,
    };
    this.user = userProfile;
    storage.saveUserProfile(userProfile);
    this.notify();
    await this.syncFromCloud().catch(() => {});
    return userProfile;
  }

  public async signUpWithEmail(email: string, password: string, name: string): Promise<UserProfile> {
    if (!auth) {
      throw new Error('Authentication is currently not configured or unavailable.');
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(result.user, { displayName: name }).catch(() => {});
    }
    const firebaseUser = result.user;
    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: name || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`,
    };
    this.user = userProfile;
    storage.saveUserProfile(userProfile);
    this.notify();
    return userProfile;
  }

  public async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    if (!auth) {
      throw new Error('Authentication is currently not configured or unavailable.');
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;
    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`,
    };
    this.user = userProfile;
    storage.saveUserProfile(userProfile);
    this.notify();
    await this.syncFromCloud().catch(() => {});
    return userProfile;
  }

  public async signOut(): Promise<void> {
    if (this.user) {
      await this.syncToCloud().catch(() => {});
    }
    if (auth) {
      await signOut(auth).catch(() => {});
    }
    this.user = null;
    storage.saveUserProfile(null);

    // Complete privacy wipe: clear all local storage caches so shared PCs remain clean
    try {
      localStorage.removeItem('melodix_api_keys');
      localStorage.removeItem('melodix_liked_tracks');
      localStorage.removeItem('melodix_user_playlists');
      localStorage.removeItem('melodix_playback_history');
      localStorage.removeItem('melodix_search_history');
      localStorage.removeItem('melodix_downloads');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Logout cleanup error:', e);
    }

    this.notify();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('melodix-auth-logout'));
    }
  }

  public async syncToCloud(): Promise<void> {
    if (!this.user || !firebaseConfig.databaseURL) return;
    try {
      let apiKeys: any[] = [];
      try {
        const raw = localStorage.getItem('melodix_api_keys');
        if (raw) apiKeys = JSON.parse(raw);
      } catch {}

      const payload: FirebaseUserData = {
        likedTracks: storage.getLikedTracks(),
        playlists: storage.getUserPlaylists(),
        history: storage.getHistory(),
        searchHistory: storage.getSearchHistory(),
        apiKeys,
        lastUpdated: new Date().toISOString(),
      };
      const url = `${firebaseConfig.databaseURL}/users/${this.user.uid}.json`;
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {
      console.warn('Sync to cloud error:', e);
    }
  }

  public async syncFromCloud(): Promise<FirebaseUserData | null> {
    if (!this.user || !firebaseConfig.databaseURL) return null;
    try {
      const url = `${firebaseConfig.databaseURL}/users/${this.user.uid}.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data: FirebaseUserData = await res.json();
      if (data) {
        if (data.likedTracks) storage.saveLikedTracks(data.likedTracks);
        if (data.playlists) storage.saveUserPlaylists(data.playlists);
        if (data.history) storage.saveHistory(data.history);
        if (data.searchHistory) storage.saveSearchHistory(data.searchHistory);
        if (data.apiKeys && Array.isArray(data.apiKeys)) {
          localStorage.setItem('melodix_api_keys', JSON.stringify(data.apiKeys));
        }
      }
      return data;
    } catch (e) {
      return null;
    }
  }
}

export const firebaseAuth = new FirebaseAuthService();
