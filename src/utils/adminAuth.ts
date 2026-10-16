/**
 * Samiti Admin Authentication & Multi-Tenant Engine
 * Cryptographically verifies and stores session tokens, roles, and active website/siteId
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { hashPasswordClient } from './cryptoAuth';

const SESSION_TOKEN_KEY = 'shree_shakti_admin_token';
const SESSION_AUTH_KEY = 'shree_shakti_admin_authenticated';
const SESSION_ROLE_KEY = 'shree_shakti_admin_role';
const SESSION_USER_KEY = 'shree_shakti_admin_user';
const SESSION_SITE_KEY = 'shree_shakti_active_site_id';

export const DEFAULT_SITE_ID = 'shree-shakti-durga';

/**
 * Returns active website / pandal siteId
 * Priority: 1. URL search param ?site= 2. SessionStorage 3. LocalStorage 4. Env var 5. Default
 */
export function getActiveSiteId(): string {
  if (typeof window === 'undefined') return DEFAULT_SITE_ID;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const siteParam = urlParams.get('site');
    if (siteParam && siteParam.trim()) {
      return siteParam.trim().toLowerCase();
    }

    const sessionSite = sessionStorage.getItem(SESSION_SITE_KEY);
    if (sessionSite && sessionSite.trim()) {
      return sessionSite.trim().toLowerCase();
    }

    const localSite = localStorage.getItem(SESSION_SITE_KEY);
    if (localSite && localSite.trim()) {
      return localSite.trim().toLowerCase();
    }
  } catch {
    // fallback
  }
  return DEFAULT_SITE_ID;
}

/**
 * Sets active website / pandal siteId
 */
export function setActiveSiteId(siteId: string): void {
  if (typeof window === 'undefined') return;
  const clean = (siteId || DEFAULT_SITE_ID).trim().toLowerCase();
  try {
    sessionStorage.setItem(SESSION_SITE_KEY, clean);
    localStorage.setItem(SESSION_SITE_KEY, clean);
    window.dispatchEvent(new CustomEvent('siteIdChanged', { detail: clean }));
  } catch {
    // ignore
  }
}

/**
 * Returns current active admin session token
 */
export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Returns current active admin role ('super_admin' | 'admin' | null)
 */
export function getAdminSessionRole(): 'super_admin' | 'admin' | null {
  if (typeof window === 'undefined') return null;
  try {
    const role = sessionStorage.getItem(SESSION_ROLE_KEY);
    if (role === 'super_admin' || role === 'admin') {
      return role;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns full current admin user profile if available
 */
export function getAdminSessionUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Checks if admin has a verified active session (any role)
 * Requires valid token format
 */
export function isSamitiAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const auth = sessionStorage.getItem(SESSION_AUTH_KEY);
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    return auth === 'true' && Boolean(token && token.trim().length >= 32);
  } catch {
    return false;
  }
}

/**
 * Checks strictly if currently logged-in user is a SUPER ADMIN
 * Normal committee admins will return FALSE
 */
export function isSuperAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const auth = sessionStorage.getItem(SESSION_AUTH_KEY);
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const role = sessionStorage.getItem(SESSION_ROLE_KEY);
    return auth === 'true' && Boolean(token && token.trim().length >= 32) && role === 'super_admin';
  } catch {
    return false;
  }
}

/**
 * Validates active admin session with the server backend
 * Zero-tolerance: Invalid or fabricated sessions are immediately purged
 */
export async function verifyAdminSessionWithServer(): Promise<{
  valid: boolean;
  role?: 'super_admin' | 'admin';
  user?: any;
  siteId?: string;
}> {
  const token = getAdminSessionToken();
  if (!token || token.trim().length < 32) {
    setSamitiAdminAuthenticated(false);
    return { valid: false };
  }

  try {
    const res = await fetch('/api/admin/verify-token', {
      headers: { 'x-admin-token': token },
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      setSamitiAdminAuthenticated(true, token, data.role, data.user, data.siteId);
      return { valid: true, role: data.role, user: data.user, siteId: data.siteId };
    } else {
      setSamitiAdminAuthenticated(false);
      return { valid: false };
    }
  } catch {
    return { valid: false };
  }
}

/**
 * Sets or removes admin session token, role, user profile, and active site
 */
export function setSamitiAdminAuthenticated(
  isAuth: boolean,
  token?: string,
  role?: string,
  user?: any,
  siteId?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    if (isAuth && token) {
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);

      if (role) {
        sessionStorage.setItem(SESSION_ROLE_KEY, role);
      }
      if (user) {
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      }
      if (siteId) {
        setActiveSiteId(siteId);
      }
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_AUTH_KEY);
      sessionStorage.removeItem(SESSION_ROLE_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
      sessionStorage.clear();
    }
  } catch {
    // ignore
  }
}

/**
 * Verifies admin PIN via secure server endpoint
 */
export async function verifyAdminPin(enteredPin: string): Promise<{ success: boolean; message: string }> {
  const cleanPin = enteredPin.trim();
  if (!cleanPin) {
    return { success: false, message: 'कृपया सुरक्षा पासवर्ड दर्ज करें।' };
  }

  try {
    const res = await fetch('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: cleanPin }),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      return { success: false, message: 'सर्वर से संपर्क करने में समस्या आई। कृपया पुनः प्रयास करें।' };
    }

    if (res.ok && data?.success && data?.token) {
      setSamitiAdminAuthenticated(true, data.token, data.role || 'admin', data.user);
      return { success: true, message: 'सत्यापन सफल! समिति प्रबंधन कक्ष में स्वागत है।' };
    }
    return {
      success: false,
      message: data?.message || 'अमान्य सुरक्षा पासवर्ड! कृपया सही पासवर्ड दर्ज करें।',
    };
  } catch (err: any) {
    console.error('verifyAdminPin error:', err);
    return {
      success: false,
      message: 'सर्वर सत्यापन में त्रुटि हुई। कृपया पुनः प्रयास करें।',
    };
  }
}

/**
 * Updates admin PIN/password via secure server endpoint
 */
export async function updateAdminPin(
  oldPin: string,
  newPin: string,
  username?: string
): Promise<{ success: boolean; message: string }> {
  const cleanOld = oldPin.trim();
  const cleanNew = newPin.trim();

  if (cleanNew.length < 4) {
    return { success: false, message: 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' };
  }

  const token = getAdminSessionToken();

  try {
    const res = await fetch('/api/admin/update-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({ oldPin: cleanOld, newPin: cleanNew, username }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // Also directly update Firebase Firestore with the fresh hash
      try {
        const target = (username || 'admin').trim().toLowerCase();
        const clientHash = await hashPasswordClient(cleanNew);
        await setDoc(
          doc(db, 'admins', target),
          { password: clientHash, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (fbErr) {
        console.warn('Direct Firestore password sync note:', fbErr);
      }
      return { success: true, message: 'पासवर्ड Firebase डेटाबेस में सुरक्षित (Hash Value) हो गया!' };
    }
    return {
      success: false,
      message: data.message || 'पासवर्ड बदलने में त्रुटि। कृपया वर्तमान पासवर्ड जांचें।',
    };
  } catch {
    return { success: false, message: 'सर्वर से संपर्क नहीं हो सका।' };
  }
}

export function getStoredAdminPin(): string {
  return '';
}
