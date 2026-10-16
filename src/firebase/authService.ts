import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './config';
import { setSamitiAdminAuthenticated } from '../utils/adminAuth';

export const SUPER_ADMIN_EMAIL = 'kushwahaarjun9970@gmail.com';

export interface AdminUserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'super_admin' | 'admin' | 'tech_lead';
  isAuthorized: boolean;
}

/**
 * Checks if a user is an authorized admin in Firestore and verifies with backend
 */
export async function checkAdminAuthorization(user: User): Promise<AdminUserData> {
  const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // If super admin, ensure document in /admins/{uid} exists
  if (isSuperAdmin) {
    try {
      const adminRef = doc(db, 'admins', user.uid);
      await setDoc(
        adminRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Arjun Kushwaha (Tech Lead)',
          photoURL: user.photoURL || '',
          role: 'super_admin',
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Superadmin doc sync note:', e);
    }

    try {
      const idToken = await user.getIdToken();
      const srvRes = await fetch('/api/admin/verify-google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const srvData = await srvRes.json();
      if (srvRes.ok && srvData.success && srvData.token) {
        setSamitiAdminAuthenticated(true, srvData.token, srvData.role || 'super_admin', srvData.user);
      }
    } catch (srvErr) {
      console.warn('Backend OAuth sync note:', srvErr);
    }

    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Arjun Kushwaha (Tech Lead)',
      photoURL: user.photoURL || '',
      role: 'super_admin',
      isAuthorized: true,
    };
  }

  // For other users, verify with backend
  try {
    const idToken = await user.getIdToken();
    const srvRes = await fetch('/api/admin/verify-google-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const srvData = await srvRes.json();
    if (srvRes.ok && srvData.success && srvData.token) {
      setSamitiAdminAuthenticated(true, srvData.token, srvData.role || 'admin', srvData.user);
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: srvData.user?.displayName || user.displayName || 'Committee Admin',
        photoURL: user.photoURL || '',
        role: srvData.role || 'admin',
        isAuthorized: true,
      };
    }
  } catch (error) {
    console.warn('Admin check note:', error);
  }

  // Not authorized
  setSamitiAdminAuthenticated(false);
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'Devotee',
    photoURL: user.photoURL || '',
    role: 'admin',
    isAuthorized: false,
  };
}

/**
 * Sign in with Google Popup and verify Firestore Admin role via secure server endpoint
 */
export async function loginWithGoogleAdmin(): Promise<{
  success: boolean;
  user?: AdminUserData;
  message: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();

    // Verify token cryptographically on backend server
    const srvRes = await fetch('/api/admin/verify-google-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const srvData = await srvRes.json();

    if (!srvRes.ok || !srvData.success || !srvData.token) {
      await signOut(auth);
      setSamitiAdminAuthenticated(false);
      return {
        success: false,
        message: srvData.message || `पहुंच अस्वीकृत: ${result.user.email} अधिकृत एडमिन नहीं है।`,
      };
    }

    // Set authenticated session with real cryptographically random server token
    setSamitiAdminAuthenticated(true, srvData.token, srvData.role || 'super_admin', srvData.user);

    const adminInfo: AdminUserData = {
      uid: result.user.uid,
      email: result.user.email || '',
      displayName: srvData.user?.displayName || result.user.displayName || 'Super Admin',
      photoURL: result.user.photoURL || '',
      role: srvData.role || 'super_admin',
      isAuthorized: true,
    };

    return {
      success: true,
      user: adminInfo,
      message: srvData.message || `स्वागत है ${adminInfo.displayName}! प्रमाणीकरण सफल हुआ।`,
    };
  } catch (err: any) {
    console.error('Google Sign-in error:', err);
    return {
      success: false,
      message: err?.message?.includes('popup-closed-by-user')
        ? 'लॉगिन पॉपअप बंद कर दिया गया।'
        : 'प्रमाणीकरण त्रुटि: ' + (err?.message || 'अज्ञात त्रुटि'),
    };
  }
}

/**
 * Logout admin session
 */
export async function logoutAdmin(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  setSamitiAdminAuthenticated(false);
}

/**
 * Listen to admin authentication state
 */
export function subscribeToFirebaseAuthState(
  callback: (user: User | null, adminData: AdminUserData | null) => void
) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const adminData = await checkAdminAuthorization(firebaseUser);
      callback(firebaseUser, adminData.isAuthorized ? adminData : null);
    } else {
      callback(null, null);
    }
  });
}
