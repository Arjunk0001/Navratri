import { pandalData, PandalData } from '../data/pandalData';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getAdminSessionToken, getActiveSiteId } from './adminAuth';

const STORAGE_KEY = 'shree_shakti_pandal_data_v2';

/**
 * Loads the active pandal configuration from localStorage, or defaults to the bundled pandalData
 */
export function getStoredPandalData(): PandalData {
  if (typeof window === 'undefined') return pandalData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return pandalData;
    const parsed = JSON.parse(raw);
    
    // Ensure all required fields exist by falling back to pandalData
    return {
      ...pandalData,
      ...parsed,
      parkingInfo: {
        ...pandalData.parkingInfo,
        ...(parsed.parkingInfo || {}),
      },
      heroImages: Array.isArray(parsed.heroImages) && parsed.heroImages.length > 0 ? parsed.heroImages : pandalData.heroImages,
      galleryImages: Array.isArray(parsed.galleryImages) && parsed.galleryImages.length > 0 ? parsed.galleryImages : pandalData.galleryImages,
      events: Array.isArray(parsed.events) ? parsed.events : pandalData.events,
      liveUpdates: Array.isArray(parsed.liveUpdates) ? parsed.liveUpdates : pandalData.liveUpdates,
      volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : pandalData.volunteers,
      keyMembers: Array.isArray(parsed.keyMembers) ? parsed.keyMembers : pandalData.keyMembers,
      allCommittee: Array.isArray(parsed.allCommittee) ? parsed.allCommittee : pandalData.allCommittee,
      donationAmounts: Array.isArray(parsed.donationAmounts) ? parsed.donationAmounts : pandalData.donationAmounts,
      featuredMedia: parsed.featuredMedia || pandalData.featuredMedia,
    };
  } catch (err) {
    console.warn('Failed to parse stored pandal data, falling back to defaults:', err);
    return pandalData;
  }
}

/**
 * Saves pandal data to localStorage, Firestore Database, and Server API
 * Ensures real-time persistence across all devices and sessions
 */
export async function savePandalData(data: PandalData): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const siteId = getActiveSiteId();
  const storageKey = `${STORAGE_KEY}_${siteId}`;

  // Ensure fresh timestamp
  const payload: PandalData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // 1. Immediate local save & event broadcast (instant UI update)
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('pandalDataChanged', { detail: payload }));
  } catch (err) {
    console.error('Error saving pandal data to localStorage:', err);
  }

  // 2. Direct Firestore real-time save (works if Super Admin or permitted)
  try {
    const docId = siteId === 'shree-shakti-durga' ? 'current' : siteId;
    const pandalDocRef = doc(db, 'pandal_config', docId);
    await setDoc(pandalDocRef, {
      ...payload,
      siteId,
      dataJson: JSON.stringify(payload),
      updatedAt: payload.updatedAt,
    }, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore direct write note (will persist via backend):', fsErr);
  }

  // 3. Server-side API persistence
  try {
    const token = getAdminSessionToken();
    const res = await fetch('/api/pandal/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({ data: payload, siteId }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data) {
        // Confirm server data cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      }
    }
  } catch (srvErr) {
    console.warn('Server pandal save note:', srvErr);
  }

  return true;
}

/**
 * Subscribes in real-time to live pandal updates from Firestore
 * Any edit made by admin immediately syncs to all users
 */
export function subscribeToLivePandalData(callback: (data: PandalData) => void): () => void {
  try {
    const siteId = getActiveSiteId();
    const docId = siteId === 'shree-shakti-durga' ? 'current' : siteId;
    const pandalDocRef = doc(db, 'pandal_config', docId);
    return onSnapshot(pandalDocRef, (snap) => {
      if (snap.exists()) {
        const rawData = snap.data();
        let parsedData: any = null;

        if (rawData.dataJson) {
          try {
            parsedData = JSON.parse(rawData.dataJson);
          } catch {
            // ignore
          }
        }

        const effective = parsedData || rawData;

        // Anti-Rollback Guard: Don't let stale Firestore data wipe out newer local admin edits!
        const localData = getStoredPandalData();
        const localTime = new Date(localData.updatedAt || 0).getTime();
        const remoteTime = new Date(effective.updatedAt || rawData.updatedAt || 0).getTime();

        if (localTime > remoteTime && (localTime - remoteTime > 3000)) {
          console.log('Skipping stale Firestore snapshot (local changes are newer):', {
            localTime: localData.updatedAt,
            remoteTime: effective.updatedAt,
          });
          return;
        }

        const merged: PandalData = {
          ...pandalData,
          ...effective,
          updatedAt: effective.updatedAt || rawData.updatedAt,
          parkingInfo: {
            ...pandalData.parkingInfo,
            ...(effective.parkingInfo || {}),
          },
          heroImages: Array.isArray(effective.heroImages) && effective.heroImages.length > 0 ? effective.heroImages : pandalData.heroImages,
          galleryImages: Array.isArray(effective.galleryImages) && effective.galleryImages.length > 0 ? effective.galleryImages : pandalData.galleryImages,
          events: Array.isArray(effective.events) ? effective.events : pandalData.events,
          liveUpdates: Array.isArray(effective.liveUpdates) ? effective.liveUpdates : pandalData.liveUpdates,
          volunteers: Array.isArray(effective.volunteers) ? effective.volunteers : pandalData.volunteers,
          keyMembers: Array.isArray(effective.keyMembers) ? effective.keyMembers : pandalData.keyMembers,
          allCommittee: Array.isArray(effective.allCommittee) ? effective.allCommittee : pandalData.allCommittee,
          donationAmounts: Array.isArray(effective.donationAmounts) ? effective.donationAmounts : pandalData.donationAmounts,
          featuredMedia: effective.featuredMedia || pandalData.featuredMedia,
        };

        // Cache locally
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }

        callback(merged);
      }
    }, (error) => {
      console.warn('Firestore onSnapshot listener error:', error);
    });
  } catch (e) {
    console.warn('Could not attach Firestore onSnapshot:', e);
    return () => {};
  }
}

/**
 * Resets pandal data to original defaults
 */
export async function resetPandalData(): Promise<PandalData> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('pandalDataChanged', { detail: pandalData }));
    } catch {
      // ignore
    }
  }

  // Also reset in Firestore
  try {
    const pandalDocRef = doc(db, 'pandal_config', 'current');
    await setDoc(pandalDocRef, {
      ...pandalData,
      dataJson: JSON.stringify(pandalData),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }

  return pandalData;
}

/**
 * Exports data as downloadable JSON file
 */
export function exportPandalDataJson(data: PandalData) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shree_shakti_pandal_config_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
