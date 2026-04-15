import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// Firestore Helpers
export const saveSessionToFirestore = async (userId: string, session: any) => {
  try {
    await setDoc(doc(db, 'users', userId, 'sessions', session.id), session);
  } catch (error) {
    console.error("Error saving session to Firestore", error);
  }
};

export const deleteSessionFromFirestore = async (userId: string, sessionId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
  } catch (error) {
    console.error("Error deleting session from Firestore", error);
  }
};
