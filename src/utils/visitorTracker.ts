import { doc, onSnapshot, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

const LOCAL_STORAGE_FLOOR_KEY = 'shree_shakti_max_visitor_count';
const SESSION_VISIT_KEY = 'shree_shakti_session_visit_registered';
const BASELINE_VISITORS = 150;

let currentVisitorCount: number = Math.max(
  parseInt(localStorage.getItem(LOCAL_STORAGE_FLOOR_KEY) || '150', 10) || 150,
  BASELINE_VISITORS
);

const subscribers = new Set<(count: number) => void>();

function updateCountSafely(newTotal: number) {
  if (Number.isFinite(newTotal) && newTotal >= currentVisitorCount) {
    currentVisitorCount = newTotal;
    try {
      localStorage.setItem(LOCAL_STORAGE_FLOOR_KEY, String(currentVisitorCount));
    } catch {
      // ignore quota errors
    }
    subscribers.forEach((cb) => {
      try {
        cb(currentVisitorCount);
      } catch (err) {
        console.error('Visitor listener error:', err);
      }
    });
  }
}

/**
 * Initializes persistent cumulative visitor tracking.
 * - Increments once per browser session in Firestore (and syncs to server)
 * - Listens in real-time to Firestore so count updates live across all devices
 * - Never resets back or drops even across browser reloads or server restarts
 */
export function initVisitorTracking(onCountChange: (total: number) => void): () => void {
  subscribers.add(onCountChange);
  // Immediately provide cached highest count
  onCountChange(currentVisitorCount);

  // 1. Check if this browser session has been counted
  const hasVisitedThisSession = sessionStorage.getItem(SESSION_VISIT_KEY) === '1';

  const registerSessionVisit = async () => {
    try {
      if (!hasVisitedThisSession) {
        sessionStorage.setItem(SESSION_VISIT_KEY, '1');

        // Atomically increment in Firestore (Cloud Database)
        try {
          const statsDocRef = doc(db, 'system_metadata', 'visitor_stats');
          await setDoc(
            statsDocRef,
            {
              total: increment(1),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn('Firestore visitor increment note:', fsErr);
        }

        // Also inform Express server to persist in container file & memory
        try {
          const srvRes = await fetch('/api/visitors/count', {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
          });
          if (srvRes.ok) {
            const data = await srvRes.json();
            if (data.success && Number.isFinite(data.total)) {
              updateCountSafely(data.total);
            }
          }
        } catch {
          // network resilience
        }
      } else {
        // Already registered session, sync latest from server
        try {
          const srvRes = await fetch('/api/visitors/count', { cache: 'no-store' });
          if (srvRes.ok) {
            const data = await srvRes.json();
            if (data.success && Number.isFinite(data.total)) {
              updateCountSafely(data.total);
            }
          }
        } catch {
          // network resilience
        }
      }
    } catch (err) {
      console.warn('Visitor registration note:', err);
    }
  };

  registerSessionVisit();

  // 2. Real-time Firestore onSnapshot listener for instant multi-user updates
  let unsubscribeFirestore = () => {};
  try {
    const statsDocRef = doc(db, 'system_metadata', 'visitor_stats');
    unsubscribeFirestore = onSnapshot(
      statsDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const total = Number(data?.total);
          if (Number.isFinite(total)) {
            updateCountSafely(total);
          }
        }
      },
      (err) => {
        console.warn('Firestore visitor snapshot note:', err);
      }
    );
  } catch (err) {
    console.warn('Could not attach Firestore visitor snapshot:', err);
  }

  // 3. Periodic background poll fallback (every 30 seconds)
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/visitors/count', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Number.isFinite(data.total)) {
          updateCountSafely(data.total);
        }
      }
    } catch {
      // resilience
    }
  }, 30000);

  return () => {
    subscribers.delete(onCountChange);
    unsubscribeFirestore();
    clearInterval(pollInterval);
  };
}

export function getCurrentVisitorCount(): number {
  return currentVisitorCount;
}
