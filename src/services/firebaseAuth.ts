import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { UserProfile, Track, Playlist } from '../types/music';
import { storage } from '../utils/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(result.user, { displayName: name });
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
    // Sync before signout to preserve work in cloud
    await this.syncToCloud().catch(() => {});
    await signOut(auth);
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
    if (!this.user) return;
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
    if (!this.user) return null;
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
