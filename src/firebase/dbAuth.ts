import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { setSamitiAdminAuthenticated, getAdminSessionToken, getActiveSiteId } from '../utils/adminAuth';
import { hashPasswordClient, verifyPasswordClient } from '../utils/cryptoAuth';

export interface AdminProfile {
  username: string;
  email?: string;
  displayName: string;
  pandalName?: string;
  siteId?: string;
  role: 'super_admin' | 'admin';
}

export interface DatabaseLoginResult {
  success: boolean;
  user?: AdminProfile;
  message: string;
}

/**
 * Updates admin password securely in Firebase Firestore as a hash value.
 */
export async function saveAdminToFirestore(
  username: string,
  password: string,
  pandalName?: string,
  displayName?: string,
  role?: string
): Promise<{ success: boolean; message: string }> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanPass) {
    return { success: false, message: 'पासवर्ड आवश्यक है।' };
  }

  try {
    // 1. Hash the password into cryptographic PBKDF2 value
    const passwordHash = await hashPasswordClient(cleanPass);

    // 2. Write hash value directly to Firebase Firestore
    const adminDocRef = doc(db, 'admins', cleanUser);
    await setDoc(
      adminDocRef,
      {
        username: cleanUser,
        password: passwordHash,
        updatedAt: new Date().toISOString(),
        ...(displayName ? { displayName } : {}),
        ...(pandalName ? { pandalName } : {}),
        ...(role ? { role } : {}),
      },
      { merge: true }
    );

    // 3. Also sync with server vault
    const token = getAdminSessionToken();
    try {
      await fetch('/api/admin/update-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-admin-token': token } : {}),
        },
        body: JSON.stringify({ newPin: cleanPass, username: cleanUser }),
      });
    } catch {
      // server sync note
    }

    return { success: true, message: 'नया पासवर्ड Firebase डेटाबेस में सुरक्षित (Hash Value) हो गया!' };
  } catch (err: any) {
    console.error('saveAdminToFirestore error:', err);
    return { success: false, message: 'Firebase में पासवर्ड सुरक्षित करने में त्रुटि: ' + (err?.message || 'त्रुटि') };
  }
}

/**
 * Validates committee admin credentials against Firebase Firestore
 */
export async function verifyDatabaseLogin(
  usernameInput: string,
  passwordInput: string
): Promise<DatabaseLoginResult> {
  const cleanUser = usernameInput.trim().toLowerCase() || 'admin';
  const cleanPass = passwordInput.trim();

  if (!cleanPass) {
    return {
      success: false,
      message: 'कृपया समिति एडमिन पासवर्ड या सुरक्षा पिन दर्ज करें।',
    };
  }

  // 1. DIRECT FIREBASE FIRESTORE HASH MATCH
  try {
    const adminDocRef = doc(db, 'admins', cleanUser);
    const snap = await getDoc(adminDocRef);

    if (snap.exists()) {
      const data = snap.data();
      const storedHash = data.password || data.passwordHash || '';
      const isMatch = await verifyPasswordClient(cleanPass, storedHash);

      if (isMatch) {
        const assignedRole = data.role === 'super_admin' ? 'super_admin' : 'admin';
        const profile: AdminProfile = {
          username: cleanUser,
          displayName: data.displayName || cleanUser,
          role: assignedRole,
          siteId: data.siteId || getActiveSiteId() || 'shree-shakti-durga',
          email: data.email || `${cleanUser}@samiti.local`,
          pandalName: data.pandalName || 'Shree Shakti Durga Puja Samiti',
        };

        const mockToken = 'fb_' + Math.random().toString(36).substring(2) + Date.now();
        setSamitiAdminAuthenticated(true, mockToken, assignedRole, profile, profile.siteId);

        // Notify server in background to keep sessions synchronized
        fetch('/api/admin/db-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUser,
            password: cleanPass,
            requestedRole: 'admin',
            siteId: getActiveSiteId(),
          }),
        })
          .then((r) => r.json())
          .then((resData) => {
            if (resData.token) {
              setSamitiAdminAuthenticated(true, resData.token, assignedRole, profile, profile.siteId);
            }
          })
          .catch(() => {});

        return {
          success: true,
          user: profile,
          message: 'Firebase से सत्यापन सफल! स्वागत है ' + profile.displayName,
        };
      }
    }
  } catch (fbErr) {
    console.warn('Firebase direct admin check note:', fbErr);
  }

  // 2. SERVER ENDPOINT FALLBACK
  try {
    const response = await fetch('/api/admin/db-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUser,
        password: cleanPass,
        requestedRole: 'admin',
        siteId: getActiveSiteId(),
      }),
    });

    const data = await response.json();
    if (response.ok && data?.success && data?.token) {
      const assignedRole = data.user?.role === 'super_admin' ? 'super_admin' : 'admin';
      setSamitiAdminAuthenticated(true, data.token, assignedRole, data.user, data.user?.siteId);
      return {
        success: true,
        user: data.user,
        message: data.message || 'लॉगिन सफल!',
      };
    } else if (data?.message) {
      return {
        success: false,
        message: data.message,
      };
    }
  } catch (err: any) {
    console.warn('Server login attempt warning:', err);
  }

  return {
    success: false,
    message: 'अमान्य पासवर्ड या यूज़रनेम! Firebase डेटाबेस में दर्ज पासवर्ड से मेल नहीं खाता।',
  };
}

/**
 * Validates Super Admin credentials against Firebase Firestore
 */
export async function verifySuperAdminLogin(
  usernameInput: string,
  passwordInput: string
): Promise<DatabaseLoginResult> {
  const cleanUser = usernameInput.trim().toLowerCase() || 'kushwahaarjun9970';
  const cleanPass = passwordInput.trim();

  if (!cleanPass) {
    return {
      success: false,
      message: 'कृपया मुख्य सुपर एडमिन पासवर्ड दर्ज करें।',
    };
  }

  // 1. DIRECT FIREBASE FIRESTORE HASH MATCH
  try {
    const adminDocRef = doc(db, 'admins', cleanUser);
    const snap = await getDoc(adminDocRef);

    if (snap.exists()) {
      const data = snap.data();
      const storedHash = data.password || data.passwordHash || '';
      const isMatch = await verifyPasswordClient(cleanPass, storedHash);

      if (isMatch) {
        if (data.role !== 'super_admin' && cleanUser !== 'kushwahaarjun9970') {
          return {
            success: false,
            message: 'यह खाता मुख्य सुपर एडमिन के रूप में अधिकृत नहीं है।',
          };
        }

        const profile: AdminProfile = {
          username: cleanUser,
          displayName: data.displayName || 'Arjun Kushwaha (मुख्य सुपर एडमिन)',
          role: 'super_admin',
          siteId: '*',
          email: data.email || 'kushwahaarjun9970@gmail.com',
          pandalName: data.pandalName || 'अखिल भारतीय मास्टर कंट्रोल',
        };

        const mockToken = 'fb_sa_' + Math.random().toString(36).substring(2) + Date.now();
        setSamitiAdminAuthenticated(true, mockToken, 'super_admin', profile, '*');

        // Notify server in background to sync session
        fetch('/api/admin/db-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUser,
            password: cleanPass,
            requestedRole: 'super_admin',
          }),
        })
          .then((r) => r.json())
          .then((resData) => {
            if (resData.token) {
              setSamitiAdminAuthenticated(true, resData.token, 'super_admin', profile, '*');
            }
          })
          .catch(() => {});

        return {
          success: true,
          user: profile,
          message: 'Firebase सुपर एडमिन प्रमाणीकरण सफल! स्वागत है अर्जुन कुशवाहा।',
        };
      }
    }
  } catch (fbErr) {
    console.warn('Firebase direct super-admin check note:', fbErr);
  }

  // 2. SERVER ENDPOINT FALLBACK
  try {
    const response = await fetch('/api/admin/db-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUser,
        password: cleanPass,
        requestedRole: 'super_admin',
      }),
    });

    const data = await response.json();
    if (response.ok && data?.success && data?.token) {
      if (data.user?.role !== 'super_admin') {
        return {
          success: false,
          message: 'यह खाता सुपर एडमिन के रूप में अधिकृत नहीं है। केवल मुख्य सुपर एडमिन ही यहाँ लॉगिन कर सकते हैं।',
        };
      }

      setSamitiAdminAuthenticated(true, data.token, 'super_admin', data.user, data.user?.siteId);
      return {
        success: true,
        user: data.user,
        message: data.message || 'सुपर एडमिन प्रमाणीकरण सफल!',
      };
    } else if (data?.message) {
      return {
        success: false,
        message: data.message,
      };
    }
  } catch (err: any) {
    console.warn('Server super-admin login attempt note:', err);
  }

  return {
    success: false,
    message: 'अमान्य सुपर एडमिन क्रेडेंशियल्स! Firebase में दर्ज पासवर्ड से मेल नहीं खाता।',
  };
}
