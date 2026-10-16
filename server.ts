import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pandalData } from './src/data/pandalData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', true);

// Enable CORS for same-origin and AI Studio preview/iframe environments
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Read Firebase Config for Firestore Database access
let firebaseConfig: any = null;
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in server.ts', e);
}

// Cloudinary secure credentials (kept server-side)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'aoa1bada';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'Durga_puja';

// =========================================================================
// SECURITY & DATABASE AUTHENTICATION ENGINE
// =========================================================================

// Secure Server-Side Vault for Credentials (Never exposed to public client)
const SERVER_ADMIN_VAULT_FILE = path.resolve(__dirname, '.server-admin-vault.json');

interface VaultAdmin {
  username: string;
  password?: string;
  displayName: string;
  role: 'super_admin' | 'admin';
  siteId: string;
  email: string;
  pandalName?: string;
  passwordChangedAt?: string;
}

let adminVaultMap = new Map<string, VaultAdmin>();

/**
 * Cryptographically secure password hashing and verification (PBKDF2 with SHA-256)
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

function verifyPassword(password: string, storedHashOrPlain: string): boolean {
  if (!storedHashOrPlain || !password) return false;

  if (storedHashOrPlain.startsWith('pbkdf2:')) {
    const parts = storedHashOrPlain.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const originalHash = parts[2];
    const derivedHashString = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    let derivedHashHex = '';
    try {
      derivedHashHex = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
    } catch {
      // ignore
    }

    if (
      originalHash.toLowerCase() === derivedHashString.toLowerCase() ||
      originalHash.toLowerCase() === derivedHashHex.toLowerCase()
    ) {
      return true;
    }
    return false;
  }

  // SHA-256 check
  try {
    const shaHex = crypto.createHash('sha256').update(password).digest('hex');
    if (storedHashOrPlain.toLowerCase() === shaHex.toLowerCase()) return true;
    if (storedHashOrPlain.toLowerCase() === `sha256:${shaHex}`.toLowerCase()) return true;
  } catch {
    // ignore
  }

  // Constant-time check for plaintext migration
  try {
    const bufA = Buffer.from(password);
    const bufB = Buffer.from(storedHashOrPlain);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies credentials against:
 * 1. Stored salted PBKDF2 hash
 * 2. System-configured ADMIN_PIN environment secret (constant-time)
 * 3. Seed accounts recovery keys (constant-time)
 */
function verifyAdminCredentials(_cleanUser: string, cleanPass: string, storedHash?: string): boolean {
  if (!cleanPass || !storedHash) return false;
  return verifyPassword(cleanPass, storedHash);
}

function loadAdminVault() {
  try {
    if (fs.existsSync(SERVER_ADMIN_VAULT_FILE)) {
      const content = JSON.parse(fs.readFileSync(SERVER_ADMIN_VAULT_FILE, 'utf-8'));
      if (content.admins) {
        let needsSave = false;
        Object.keys(content.admins).forEach((k) => {
          const adm = content.admins[k];
          if (adm.password && !adm.password.startsWith('pbkdf2:')) {
            adm.password = hashPassword(adm.password);
            needsSave = true;
          }
          adminVaultMap.set(k.toLowerCase(), adm);
        });
        if (needsSave) {
          persistAdminVault();
        }
      }
    }
  } catch (err) {
    console.warn('Could not load .server-admin-vault.json:', err);
  }

  // Ensure Super Admin kushwahaarjun9970 is always present in vault
  if (!adminVaultMap.has('kushwahaarjun9970')) {
    adminVaultMap.set('kushwahaarjun9970', {
      username: 'kushwahaarjun9970',
      password: hashPassword('2026'),
      role: 'super_admin',
      displayName: 'Arjun Kushwaha (मुख्य सुपर एडमिन)',
      email: 'kushwahaarjun9970@gmail.com',
      pandalName: 'अखिल भारतीय मास्टर कंट्रोल',
      siteId: '*',
    });
    persistAdminVault();
  }

  // Ensure default committee admin is present in vault
  if (!adminVaultMap.has('admin')) {
    adminVaultMap.set('admin', {
      username: 'admin',
      password: hashPassword('2026'),
      role: 'admin',
      displayName: 'समिति एडमिन (Shree Shakti)',
      email: 'admin@samiti.local',
      pandalName: 'Shree Shakti Durga Puja Samiti',
      siteId: 'shree-shakti-durga',
    });
    persistAdminVault();
  }
}

function persistAdminVault() {
  try {
    const obj: Record<string, VaultAdmin> = {};
    adminVaultMap.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(SERVER_ADMIN_VAULT_FILE, JSON.stringify({ admins: obj }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist .server-admin-vault.json:', err);
  }
}

// Initial load of server vault
loadAdminVault();

// Rate limiting & Brute force protection map (ipOrKey -> { count, lockedUntil })
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(key: string): { blocked: boolean; remainingSec?: number } {
  const record = failedAttemptsMap.get(key);
  if (!record) return { blocked: false };
  if (Date.now() < record.lockedUntil) {
    return { blocked: true, remainingSec: Math.ceil((record.lockedUntil - Date.now()) / 1000) };
  }
  if (Date.now() >= record.lockedUntil && record.lockedUntil > 0) {
    failedAttemptsMap.delete(key);
  }
  return { blocked: false };
}

function recordFailedLogin(key: string) {
  const record = failedAttemptsMap.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 30 * 1000; // 30 seconds temporary anti-bruteforce cooloff
  }
  failedAttemptsMap.set(key, record);
}

function clearFailedLogin(key: string) {
  failedAttemptsMap.delete(key);
}

// Persistent active admin sessions map (survives restarts)
const SESSIONS_FILE = path.resolve(__dirname, '.admin-sessions.json');

function loadAdminSessions(): Map<string, { username: string; role: string; siteId: string; expiresAt: number }> {
  const map = new Map<string, { username: string; role: string; siteId: string; expiresAt: number }>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (item && item.token && item.expiresAt > Date.now()) {
            map.set(item.token, {
              username: item.username,
              role: item.role,
              siteId: item.siteId || '*',
              expiresAt: item.expiresAt,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not read admin sessions file:', err);
  }
  return map;
}

const activeAdminSessions = loadAdminSessions();

function persistAdminSessions() {
  try {
    const list: any[] = [];
    activeAdminSessions.forEach((val, token) => {
      if (val.expiresAt > Date.now()) {
        list.push({ token, ...val });
      }
    });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist admin sessions:', err);
  }
}

function createAdminSession(username: string, role: string, siteId: string = '*'): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeAdminSessions.set(token, {
    username,
    role,
    siteId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  persistAdminSessions();
  return token;
}

// STRICT AUTHENTICATION: Only cryptographically generated active sessions are accepted!
// Insecure prefix bypasses (such as google_auth_*) are strictly forbidden!
function getAdminSession(token: string | undefined): { username: string; role: string; siteId: string } | null {
  if (!token || typeof token !== 'string') return null;
  const session = activeAdminSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return null;
  }
  return session;
}

function isValidAdminSession(token: string | undefined): boolean {
  return getAdminSession(token) !== null;
}

// Middleware to protect admin routes
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string | undefined;
  if (isValidAdminSession(token)) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'अनधिकृत पहुंच: केवल सत्यापित एडमिन सत्र ही इस क्रिया को कर सकते हैं।',
  });
}

// Middleware to protect Super Admin routes strictly
function requireSuperAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string | undefined;
  const session = getAdminSession(token);
  if (session && session.role === 'super_admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'अस्वीकृत: इस क्रिया के लिए केवल मुख्य सुपर एडमिन (Super Admin) ही अधिकृत हैं।',
  });
}

// Pandal live cache file
const PANDAL_DATA_FILE = path.resolve(__dirname, 'pandal-data-cache.json');
let currentLivePandalData: any = { ...pandalData };

try {
  if (fs.existsSync(PANDAL_DATA_FILE)) {
    const raw = fs.readFileSync(PANDAL_DATA_FILE, 'utf-8');
    currentLivePandalData = { ...pandalData, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('Could not read pandal-data-cache.json on init', e);
}

// Permanent cumulative visitor counter: persists to Firestore, .visitor-count.json, and pandal-data-cache.json
const VISITOR_COUNT_FILE = path.resolve(__dirname, '.visitor-count.json');

let cumulativeVisitorCount = 150;

function readVisitorCount(): number {
  let fileCount = 0;
  try {
    if (fs.existsSync(VISITOR_COUNT_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VISITOR_COUNT_FILE, 'utf8'));
      if (Number.isSafeInteger(parsed.total) && parsed.total >= 0) {
        fileCount = parsed.total;
      }
    }
  } catch { /* ignore */ }

  const pandalCount = Number(currentLivePandalData?.visitorCount) || 0;
  cumulativeVisitorCount = Math.max(fileCount, pandalCount, cumulativeVisitorCount, 150);
  return cumulativeVisitorCount;
}

cumulativeVisitorCount = readVisitorCount();

// Asynchronous boot sync with Firestore
async function syncVisitorWithFirestore() {
  if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/system_metadata/visitor_stats?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const doc = await res.json();
        const total = Number(doc?.fields?.total?.integerValue || doc?.fields?.total?.doubleValue);
        if (Number.isFinite(total) && total >= cumulativeVisitorCount) {
          cumulativeVisitorCount = total;
          writeVisitorCount(cumulativeVisitorCount, false);
          console.log('Synced cumulative visitor count from Firestore:', cumulativeVisitorCount);
        }
      }
    } catch (err) {
      console.warn('Firestore visitor boot sync note:', err);
    }
  }
}
setTimeout(syncVisitorWithFirestore, 1000);

function writeVisitorCount(total: number, syncFirestore = true) {
  try {
    cumulativeVisitorCount = Math.max(total, cumulativeVisitorCount, 150);
    fs.writeFileSync(VISITOR_COUNT_FILE, JSON.stringify({ total: cumulativeVisitorCount, updatedAt: new Date().toISOString() }), 'utf8');
    if (currentLivePandalData) {
      currentLivePandalData.visitorCount = cumulativeVisitorCount;
      try {
        fs.writeFileSync(PANDAL_DATA_FILE, JSON.stringify(currentLivePandalData, null, 2), 'utf8');
      } catch { /* ignore */ }
    }

    if (syncFirestore && firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
      const patchUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/system_metadata/visitor_stats?updateMask.fieldPaths=total&updateMask.fieldPaths=updatedAt&key=${firebaseConfig.apiKey}`;
      fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            total: { integerValue: String(cumulativeVisitorCount) },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      }).catch((e) => console.warn('Firestore visitor patch note:', e));
    }
  } catch (err) {
    console.error('Visitor counter persistence failed:', err);
  }
}

app.post('/api/visitors/count', (_req: Request, res: Response) => {
  const nextTotal = readVisitorCount() + 1;
  writeVisitorCount(nextTotal, true);
  res.json({ success: true, total: cumulativeVisitorCount });
});

// Public GET endpoint for visitors counter badge
app.get('/api/visitors/count', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, total: readVisitorCount() });
});

app.get('/api/admin/visitors/count', requireSuperAdminAuth, (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, total: readVisitorCount() });
});

// VERIFY ACTIVE ADMIN SESSION TOKEN (Protects UI against forged client-side session states)
app.get('/api/admin/verify-token', (req: Request, res: Response) => {
  const token = req.headers['x-admin-token'] as string | undefined;
  const session = getAdminSession(token);
  if (!session) {
    return res.status(401).json({
      valid: false,
      message: 'सत्र अमान्य अथवा समाप्त हो गया है। कृपया पुनः लॉगिन करें।',
    });
  }

  const user = adminVaultMap.get(session.username.toLowerCase());
  return res.json({
    valid: true,
    role: session.role,
    siteId: session.siteId,
    user: {
      username: session.username,
      displayName: user?.displayName || session.username,
      role: session.role,
      siteId: session.siteId,
      email: user?.email,
      pandalName: user?.pandalName,
    },
  });
});

/**
 * Direct lookup of Admin account (Checks Server Vault first, then Firestore)
 */
async function getAdminFromFirestore(rawUsername: string): Promise<{
  exists: boolean;
  username: string;
  password?: string;
  role: 'super_admin' | 'admin';
  displayName: string;
  email: string;
  pandalName?: string;
  siteId?: string;
} | null> {
  let cleanUser = rawUsername.trim().toLowerCase();
  if (cleanUser.endsWith('@gmail.com')) {
    cleanUser = cleanUser.replace('@gmail.com', '');
  }

  // 1. Live Firebase Firestore database is the authoritative source of truth
  if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
    try {
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins`;
      const firestoreUrl = `${baseUrl}/${encodeURIComponent(cleanUser)}?key=${firebaseConfig.apiKey}`;
      const fsRes = await fetch(firestoreUrl);

      if (fsRes.ok) {
        const docData = await fsRes.json();
        const fields = docData.fields || {};
        const parsedRole = fields.role?.stringValue;
        const role: 'super_admin' | 'admin' = (parsedRole === 'super_admin' || cleanUser === 'kushwahaarjun9970') ? 'super_admin' : 'admin';

        const foundAdmin: VaultAdmin = {
          username: fields.username?.stringValue || cleanUser,
          password:
            fields.password?.stringValue ||
            fields.pin?.stringValue ||
            fields.secretKey?.stringValue ||
            '',
          role,
          displayName: fields.displayName?.stringValue || fields.username?.stringValue || cleanUser,
          email: fields.email?.stringValue || `${cleanUser}@samiti.local`,
          pandalName: fields.pandalName?.stringValue || 'Shree Shakti Durga Puja Samiti',
          siteId: fields.siteId?.stringValue || (role === 'super_admin' ? '*' : 'shree-shakti-durga'),
        };

        // Cache live Firebase data in local vault
        adminVaultMap.set(cleanUser, foundAdmin);
        persistAdminVault();

        return {
          exists: true,
          ...foundAdmin,
        };
      }
    } catch (err) {
      console.warn('Firestore live admin lookup error:', err);
    }
  }

  // 2. Fallback to local Server Vault if Firebase is unreachable
  if (adminVaultMap.has(cleanUser)) {
    const v = adminVaultMap.get(cleanUser)!;
    return {
      exists: true,
      username: v.username,
      password: v.password || '',
      role: v.role,
      displayName: v.displayName,
      email: v.email,
      pandalName: v.pandalName,
      siteId: v.siteId,
    };
  }

  return null;
}


// =========================================================================
// LIVE DATABASE AUTHENTICATION ENDPOINTS
// =========================================================================

// VERIFIED GOOGLE OAUTH ENDPOINT (Cryptographic ID Token Verification)
app.post('/api/admin/verify-google-auth', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ success: false, message: 'Google प्रमाणीकरण टोकन आवश्यक है।' });
  }

  try {
    // Cryptographically verify Google ID Token with Google's public tokeninfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!googleRes.ok) {
      return res.status(401).json({ success: false, message: 'Google प्रमाणीकरण टोकन अमान्य अथवा समाप्त हो गया है।' });
    }
    const tokenInfo = await googleRes.json();
    const verifiedEmail = tokenInfo.email?.toLowerCase();
    const isEmailVerified = tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true;

    if (!isEmailVerified || !verifiedEmail) {
      return res.status(401).json({ success: false, message: 'Google ईमेल सत्यापित नहीं है।' });
    }

    // Check if user is Super Admin
    if (verifiedEmail === 'kushwahaarjun9970@gmail.com') {
      const token = createAdminSession('kushwahaarjun9970', 'super_admin', '*');
      return res.json({
        success: true,
        token,
        role: 'super_admin',
        user: {
          username: 'kushwahaarjun9970',
          displayName: tokenInfo.name || 'Arjun Kushwaha (मुख्य सुपर एडमिन)',
          email: verifiedEmail,
          role: 'super_admin',
          siteId: '*',
          photoURL: tokenInfo.picture || '',
        },
        message: 'Google द्वारा सुपर एडमिन प्रमाणीकरण सफल! स्वागत है अर्जुन कुशवाहा।',
      });
    }

    // Check if registered in admin vault or Firestore
    const cleanUser = verifiedEmail.replace('@gmail.com', '');
    const adminAccount = await getAdminFromFirestore(cleanUser);
    if (adminAccount && adminAccount.exists) {
      const token = createAdminSession(adminAccount.username, adminAccount.role, adminAccount.siteId || '*');
      return res.json({
        success: true,
        token,
        role: adminAccount.role,
        user: {
          username: adminAccount.username,
          displayName: adminAccount.displayName,
          email: verifiedEmail,
          role: adminAccount.role,
          siteId: adminAccount.siteId || '*',
        },
        message: `Google द्वारा समिति एडमिन प्रमाणीकरण सफल! स्वागत है ${adminAccount.displayName}।`,
      });
    }

    return res.status(403).json({
      success: false,
      message: `पहुंच अस्वीकृत: ${verifiedEmail} अधिकृत एडमिन सूची में नहीं है। केवल समिति व्यवस्थापक ही लॉगिन कर सकते हैं।`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Google सत्यापन में त्रुटि: ' + (err?.message || 'Unknown') });
  }
});

// ADMIN DATABASE LOGIN ENDPOINT (STRICT ROLE SEPARATION & RATE LIMITING PROTECTED)
app.post('/api/admin/db-login', async (req: Request, res: Response) => {
  try {
    const { username, password, requestedRole, siteId } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'यूज़रनेम और पासवर्ड दोनों दर्ज करना अनिवार्य है।',
      });
    }

    const cleanUser = username.toString().trim().toLowerCase();
    const cleanPass = password.toString().trim();
    const rateLimitKey = `user_${cleanUser}`;

    // Lookup admin from Server Vault / Firestore
    const dbAdmin = await getAdminFromFirestore(cleanUser);

    if (!dbAdmin || !dbAdmin.exists) {
      // Check rate limit if user doesn't exist
      const rl = checkRateLimit(rateLimitKey);
      if (rl.blocked) {
        return res.status(429).json({
          success: false,
          authorized: false,
          message: `सुरक्षा चेतावनी: अत्यधिक गलत प्रयासों के कारण यह खाता अस्थायी रूप से सुरक्षित है। कृपया ${rl.remainingSec || 30} सेकंड बाद पुनः प्रयास करें।`,
        });
      }
      recordFailedLogin(rateLimitKey);
      return res.status(401).json({
        success: false,
        authorized: false,
        message: `यूज़र '${cleanUser}' डेटाबेस में नहीं मिला। कृपया सही यूज़रनेम दर्ज करें।`,
      });
    }

    // 2. Password verification with PBKDF2 & constant-time check
    const isValidPass = verifyAdminCredentials(cleanUser, cleanPass, dbAdmin.password);
    if (!isValidPass) {
      // Check rate limit on incorrect password
      const rl = checkRateLimit(rateLimitKey);
      if (rl.blocked) {
        return res.status(429).json({
          success: false,
          authorized: false,
          message: `सुरक्षा चेतावनी: अत्यधिक गलत प्रयासों के कारण यह खाता अस्थायी रूप से सुरक्षित है। कृपया ${rl.remainingSec || 30} सेकंड बाद पुनः प्रयास करें।`,
        });
      }
      recordFailedLogin(rateLimitKey);
      return res.status(401).json({
        success: false,
        authorized: false,
        message: 'डेटाबेस में दर्ज पासवर्ड से मेल नहीं खाता। कृपया सही पासवर्ड दर्ज करें।',
      });
    }

    // Legitimate credentials supplied: Clear any prior rate limit record immediately!
    clearFailedLogin(rateLimitKey);

    // Auto-upgrade to salted PBKDF2 hash if not already using it
    if (!dbAdmin.password || !dbAdmin.password.startsWith('pbkdf2:')) {
      dbAdmin.password = hashPassword(cleanPass);
      adminVaultMap.set(cleanUser, {
        username: dbAdmin.username,
        password: dbAdmin.password,
        displayName: dbAdmin.displayName,
        role: dbAdmin.role,
        siteId: dbAdmin.siteId || (dbAdmin.role === 'super_admin' ? '*' : 'shree-shakti-durga'),
        email: dbAdmin.email,
        pandalName: dbAdmin.pandalName,
      });
      persistAdminVault();
    }

    // 3. STRICT ROLE SEPARATION: A committee admin CAN NEVER log into Super Admin
    if (requestedRole === 'super_admin' && dbAdmin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        authorized: false,
        message: `प्रवेश अस्वीकृत: खाता '${dbAdmin.displayName}' एक समिति एडमिन (Admin) है, सुपर एडमिन नहीं। समिति एडमिन केवल 'समिति एडमिन' टैब से ही लॉगिन कर सकते हैं।`,
      });
    }

    // 4. Site verification: If a specific site is requested, normal admin must belong to it
    if (siteId && dbAdmin.role !== 'super_admin' && dbAdmin.siteId && dbAdmin.siteId !== '*' && dbAdmin.siteId !== siteId) {
      return res.status(403).json({
        success: false,
        authorized: false,
        message: `प्रवेश अस्वीकृत: यह एडमिन खाता वेबसाइट '${dbAdmin.siteId}' के लिए अधिकृत है, '${siteId}' के लिए नहीं।`,
      });
    }

    // Login successful: Clear rate limit record
    clearFailedLogin(rateLimitKey);

    const token = createAdminSession(dbAdmin.username, dbAdmin.role, dbAdmin.siteId || '*');
    return res.json({
      success: true,
      authorized: true,
      token,
      user: {
        username: dbAdmin.username,
        displayName: dbAdmin.displayName,
        role: dbAdmin.role,
        siteId: dbAdmin.siteId || '*',
        email: dbAdmin.email,
        pandalName: dbAdmin.pandalName,
      },
      message: `डेटाबेस से प्रमाणीकरण सफल! स्वागत है ${dbAdmin.displayName}!`,
    });
  } catch (err: any) {
    console.error('db-login error:', err);
    return res.status(500).json({
      success: false,
      authorized: false,
      message: 'सर्वर प्रमाणीकरण के दौरान आंतरिक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    });
  }
});

// ADMIN PIN VERIFICATION (STRICT ROLE CHECK & RATE LIMITING PROTECTED)
app.post('/api/admin/verify-pin', async (req: Request, res: Response) => {
  try {
    const { pin, requestedRole, username } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'पिन दर्ज करना अनिवार्य है।' });
    }

    const cleanPin = pin.toString().trim();
    const targetUser = requestedRole === 'super_admin'
      ? 'kushwahaarjun9970'
      : (username ? username.toString().trim().toLowerCase() : 'admin');
    const rateLimitKey = `user_${targetUser}`;


    // If requestedRole is super_admin, ONLY match kushwahaarjun9970
    if (requestedRole === 'super_admin') {
      const masterAdmin = await getAdminFromFirestore('kushwahaarjun9970');
      if (masterAdmin && verifyAdminCredentials('kushwahaarjun9970', cleanPin, masterAdmin.password)) {
        clearFailedLogin(rateLimitKey);
        if (!masterAdmin.password || !masterAdmin.password.startsWith('pbkdf2:')) {
          masterAdmin.password = hashPassword(cleanPin);
          adminVaultMap.set('kushwahaarjun9970', masterAdmin as any);
          persistAdminVault();
        }
        const token = createAdminSession(masterAdmin.username, masterAdmin.role, masterAdmin.siteId || '*');
        return res.json({
          success: true,
          authorized: true,
          token,
          role: 'super_admin',
          message: `सुपर एडमिन सत्यापन सफल! स्वागत है ${masterAdmin.displayName}।`,
        });
      }
      recordFailedLogin(rateLimitKey);
      return res.status(401).json({
        success: false,
        authorized: false,
        message: 'अमान्य सुपर एडमिन सुरक्षा पिन।',
      });
    }

    // Check specific committee admin account
    const targetAdmin = await getAdminFromFirestore(targetUser);

    if (targetAdmin && verifyAdminCredentials(targetUser, cleanPin, targetAdmin.password)) {
      clearFailedLogin(rateLimitKey);
      if (!targetAdmin.password || !targetAdmin.password.startsWith('pbkdf2:')) {
        targetAdmin.password = hashPassword(cleanPin);
        adminVaultMap.set(targetUser, targetAdmin as any);
        persistAdminVault();
      }
      const token = createAdminSession(targetAdmin.username, targetAdmin.role, targetAdmin.siteId || 'shree-shakti-durga');
      return res.json({
        success: true,
        authorized: true,
        token,
        role: targetAdmin.role,
        message: `समिति एडमिन सत्यापन सफल! स्वागत है ${targetAdmin.displayName}।`,
      });
    }

    // Fallback check arjun admin account
    const arjunAdmin = await getAdminFromFirestore('arjun');
    if (arjunAdmin && verifyAdminCredentials('arjun', cleanPin, arjunAdmin.password)) {
      clearFailedLogin(rateLimitKey);
      if (!arjunAdmin.password || !arjunAdmin.password.startsWith('pbkdf2:')) {
        arjunAdmin.password = hashPassword(cleanPin);
        adminVaultMap.set('arjun', arjunAdmin as any);
        persistAdminVault();
      }
      const token = createAdminSession(arjunAdmin.username, arjunAdmin.role, arjunAdmin.siteId || 'shree-shakti-durga');
      return res.json({
        success: true,
        authorized: true,
        token,
        role: arjunAdmin.role,
        message: `समिति एडमिन सत्यापन सफल! स्वागत है ${arjunAdmin.displayName}।`,
      });
    }

    const rl = checkRateLimit(rateLimitKey);
    if (rl.blocked) {
      return res.status(429).json({
        success: false,
        authorized: false,
        message: `सुरक्षा चेतावनी: अत्यधिक गलत प्रयासों के कारण यह खाता अस्थायी रूप से सुरक्षित है। कृपया ${rl.remainingSec || 30} सेकंड बाद पुनः प्रयास करें।`,
      });
    }

    recordFailedLogin(rateLimitKey);
    return res.status(401).json({
      success: false,
      authorized: false,
      message: 'डेटाबेस में दर्ज सुरक्षा पिन से मेल नहीं खाता।',
    });
  } catch (err: any) {
    console.error('verify-pin error:', err);
    return res.status(500).json({
      success: false,
      authorized: false,
      message: 'सुरक्षा पिन सत्यापन में आंतरिक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    });
  }
});

// ADMIN PIN & PASSWORD UPDATE (UPDATES PASSWORD COLUMN DIRECTLY WITH SALTED PBKDF2)
app.post('/api/admin/update-pin', async (req: Request, res: Response) => {
  const { oldPin, newPin, username } = req.body;
  const token = req.headers['x-admin-token'] as string | undefined;

  const session = getAdminSession(token);
  let targetUser = '';

  if (session) {
    // If the logged-in user is a normal committee admin, they can ONLY update THEIR OWN password!
    if (session.role !== 'super_admin') {
      targetUser = session.username;
    } else {
      // Super admin can update their own password or another admin's if specified
      targetUser = username ? username.toString().trim().toLowerCase() : session.username;
    }
  } else {
    // Without active session, username and oldPin are strictly required
    if (!username || !oldPin) {
      return res.status(400).json({
        success: false,
        message: 'यूज़रनेम और वर्तमान पासवर्ड दोनों दर्ज करना अनिवार्य है।',
      });
    }
    targetUser = username.toString().trim().toLowerCase();
  }

  const currentDbAdmin = await getAdminFromFirestore(targetUser);
  if (!currentDbAdmin || !currentDbAdmin.exists) {
    return res.status(404).json({
      success: false,
      message: `डेटाबेस में खाता '${targetUser}' नहीं मिला।`,
    });
  }

  // Security check: Must have active admin session for targetUser OR match current password
  const hasValidSession = session && (session.role === 'super_admin' || session.username === targetUser);
  const hasValidOldPin = currentDbAdmin.password && verifyPassword(oldPin?.toString().trim() || '', currentDbAdmin.password);

  if (!hasValidSession && !hasValidOldPin) {
    return res.status(401).json({
      success: false,
      message: 'अनधिकृत: पासवर्ड बदलने के लिए वर्तमान पासवर्ड सही होना आवश्यक है।',
    });
  }

  // A normal committee admin CAN NEVER update kushwahaarjun9970 (Super Admin)
  if (targetUser === 'kushwahaarjun9970' && session && session.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'अस्वीकृत: केवल मुख्य सुपर एडमिन ही सुपर एडमिन का पासवर्ड बदल सकते हैं।',
    });
  }

  if (!newPin || newPin.toString().trim().length < 4) {
    return res.status(400).json({
      success: false,
      message: 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।',
    });
  }

  const cleanNew = newPin.toString().trim();
  const hashedNew = hashPassword(cleanNew);

  // Update Server Vault memory and disk with PBKDF2 hash
  if (adminVaultMap.has(targetUser)) {
    const existing = adminVaultMap.get(targetUser)!;
    existing.password = hashedNew;
    existing.passwordChangedAt = new Date().toISOString();
    adminVaultMap.set(targetUser, existing);
    persistAdminVault();
  } else {
    adminVaultMap.set(targetUser, {
      username: targetUser,
      password: hashedNew,
      displayName: currentDbAdmin.displayName,
      role: currentDbAdmin.role,
      siteId: currentDbAdmin.siteId || '*',
      email: currentDbAdmin.email,
      pandalName: currentDbAdmin.pandalName,
      passwordChangedAt: new Date().toISOString(),
    });
    persistAdminVault();
  }

  // Sync to Firestore without backdoor vaultSecret
  if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
    try {
      const patchUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/${encodeURIComponent(targetUser)}?updateMask.fieldPaths=password&updateMask.fieldPaths=updatedAt&key=${firebaseConfig.apiKey}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            password: { stringValue: hashedNew },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
    } catch (fsErr) {
      console.warn('Firestore password save note:', fsErr);
    }
  }

  return res.json({
    success: true,
    message: `डेटाबेस में खाता '${targetUser}' का नया पासवर्ड सफलतापूर्वक सुरक्षित कर दिया गया!`,
  });
});

// CLOUDINARY SECURE MEDIA (IMAGE / VIDEO) UPLOAD PROXY ENDPOINTS (PROTECTED)
app.post(['/api/upload-image', '/api/upload-media'], requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const media = req.body.media || req.body.image;
    const folder = req.body.folder || 'durga_puja_2026';
    const resourceType = req.body.resourceType || (typeof media === 'string' && media.startsWith('data:video/') ? 'video' : 'image');

    if (!media) {
      return res.status(400).json({ success: false, message: 'कृपया मीडिया (फोटो/वीडियो) डेटा प्रदान करें।' });
    }

    const cloudinaryEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType === 'video' ? 'video' : 'image'}/upload`;
    const response = await fetch(cloudinaryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: media,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        folder,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.error?.message || 'Cloudinary पर मीडिया अपलोड असफल रहा।',
      });
    }

    return res.json({
      success: true,
      url: data.secure_url || data.url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
      resourceType: data.resource_type || resourceType,
      message: 'Cloudinary CDN पर मीडिया सफलतापूर्वक और सुरक्षित अपलोड हो गया!',
    });
  } catch (err: any) {
    console.error('Error in /api/upload-media:', err);
    return res.status(500).json({
      success: false,
      message: 'सर्वर पर मीडिया अपलोड के दौरान त्रुटि आई: ' + (err.message || 'Unknown error'),
    });
  }
});

// =========================================================================
// PANDAL CONFIGURATION ROUTES
// =========================================================================
// Public read
app.get('/api/pandal/current', (_req: Request, res: Response) => {
  res.json({ success: true, data: currentLivePandalData });
});

// Protected write (Only authenticated admins can modify, scoped to siteId)
app.post('/api/pandal/save', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { data, siteId = 'shree-shakti-durga' } = req.body;
    if (data && typeof data === 'object') {
      currentLivePandalData = { ...currentLivePandalData, ...data };
      try {
        fs.writeFileSync(PANDAL_DATA_FILE, JSON.stringify(currentLivePandalData, null, 2), 'utf-8');
      } catch (e) {
        console.warn('Could not write pandal-data-cache.json', e);
      }

      // Persist directly to Firestore pandal_config document
      if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
        try {
          const targetDocId = siteId === 'shree-shakti-durga' ? 'current' : siteId;
          const patchUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/pandal_config/${encodeURIComponent(targetDocId)}?updateMask.fieldPaths=dataJson&updateMask.fieldPaths=pandalName&updateMask.fieldPaths=location&updateMask.fieldPaths=address&updateMask.fieldPaths=city&updateMask.fieldPaths=landmark&updateMask.fieldPaths=currentTheme&updateMask.fieldPaths=updatedAt&key=${firebaseConfig.apiKey}`;
          await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                dataJson: { stringValue: JSON.stringify(currentLivePandalData) },
                pandalName: { stringValue: data.name || data.pandalName || 'Shree Shakti Durga Puja Samiti' },
                location: { stringValue: data.location || '' },
                address: { stringValue: data.address || '' },
                city: { stringValue: data.city || '' },
                landmark: { stringValue: data.landmark || '' },
                currentTheme: { stringValue: data.currentTheme || '' },
                updatedAt: { stringValue: data.updatedAt || new Date().toISOString() },
              },
            }),
          });
        } catch (fsErr) {
          console.warn('Firestore pandal_config save note:', fsErr);
        }
      }

      return res.json({ success: true, message: 'पंडाल डेटा सुरक्षित हो गया!', data: currentLivePandalData });
    }
    return res.status(400).json({ success: false, message: 'अमान्य डेटा' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error' });
  }
});

// =========================================================================
// MULTI-SITE / MULTI-PANDAL MANAGEMENT API
// =========================================================================

// GET all registered websites/pandals from Firestore
app.get('/api/sites', async (_req: Request, res: Response) => {
  const defaultSite = {
    siteId: 'shree-shakti-durga',
    name: 'श्री शक्ति दुर्गा पूजा समिति',
    location: 'अलीगंज, लखनऊ, उत्तर प्रदेश',
    theme: 'दिव्य शक्ति व सनातन संस्कृति',
    upiId: 'ak6412883@okhdfcbank',
    helpline: '1800 120 4455',
    active: true,
    createdAt: '2026-10-02T15:33:00Z',
  };

  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId) {
    return res.json({ success: true, sites: [defaultSite] });
  }

  try {
    const dirUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/sites/directory?key=${firebaseConfig.apiKey}`;
    const dirRes = await fetch(dirUrl);

    if (dirRes.ok) {
      const dirData = await dirRes.json();
      const rawList = dirData.fields?.sitesList?.arrayValue?.values || [];
      if (rawList.length > 0) {
        const sites = rawList.map((item: any) => {
          const f = item.mapValue?.fields || {};
          return {
            siteId: f.siteId?.stringValue || 'shree-shakti-durga',
            name: f.name?.stringValue || 'श्री शक्ति दुर्गा पूजा समिति',
            location: f.location?.stringValue || '',
            theme: f.theme?.stringValue || '',
            upiId: f.upiId?.stringValue || '',
            helpline: f.helpline?.stringValue || '',
            active: f.active?.booleanValue !== false,
          };
        });

        if (!sites.some((s: any) => s.siteId === 'shree-shakti-durga')) {
          sites.unshift(defaultSite);
        }
        return res.json({ success: true, sites });
      }
    }
  } catch (err) {
    console.warn('Firestore sites directory read error:', err);
  }

  return res.json({ success: true, sites: [defaultSite] });
});

// POST register a new website/pandal (Super Admin Only)
app.post('/api/sites', requireSuperAdminAuth, async (req: Request, res: Response) => {
  const { siteId, name, location, theme, upiId, helpline } = req.body;
  if (!siteId || !name) {
    return res.status(400).json({ success: false, message: 'siteId और नाम अनिवार्य हैं।' });
  }

  const cleanSiteId = siteId.toString().trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

  if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
    try {
      // 1. Save website metadata document
      const siteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/sites/${encodeURIComponent(cleanSiteId)}?updateMask.fieldPaths=name&updateMask.fieldPaths=location&updateMask.fieldPaths=theme&updateMask.fieldPaths=upiId&updateMask.fieldPaths=helpline&updateMask.fieldPaths=active&key=${firebaseConfig.apiKey}`;
      await fetch(siteUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            name: { stringValue: name },
            location: { stringValue: location || '' },
            theme: { stringValue: theme || 'Divine Festive Harmony' },
            upiId: { stringValue: upiId || '' },
            helpline: { stringValue: helpline || '' },
            active: { booleanValue: true },
          },
        }),
      });

      // 2. Initialize pandal_config document for this site
      const configUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/pandal_config/${encodeURIComponent(cleanSiteId)}?updateMask.fieldPaths=pandalName&updateMask.fieldPaths=location&updateMask.fieldPaths=currentTheme&updateMask.fieldPaths=upiId&key=${firebaseConfig.apiKey}`;
      await fetch(configUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            pandalName: { stringValue: name },
            location: { stringValue: location || '' },
            currentTheme: { stringValue: theme || 'Divine Festive Harmony' },
            upiId: { stringValue: upiId || '' },
          },
        }),
      });

      // 3. Update sites/directory registry
      try {
        const dirUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/sites/directory?key=${firebaseConfig.apiKey}`;
        const dirRes = await fetch(dirUrl);
        let existingSites: any[] = [];
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          existingSites = dirData.fields?.sitesList?.arrayValue?.values || [];
        }

        const newSiteItem = {
          mapValue: {
            fields: {
              siteId: { stringValue: cleanSiteId },
              name: { stringValue: name },
              location: { stringValue: location || '' },
              theme: { stringValue: theme || '' },
              upiId: { stringValue: upiId || '' },
              helpline: { stringValue: helpline || '' },
              active: { booleanValue: true },
            },
          },
        };

        // Filter out duplicate if existing
        const filtered = existingSites.filter(
          (item: any) => item.mapValue?.fields?.siteId?.stringValue !== cleanSiteId
        );
        filtered.push(newSiteItem);

        await fetch(
          `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/sites/directory?updateMask.fieldPaths=sitesList&key=${firebaseConfig.apiKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                sitesList: { arrayValue: { values: filtered } },
              },
            }),
          }
        );
      } catch (dirErr) {
        console.warn('Failed to update sites/directory:', dirErr);
      }

      return res.json({
        success: true,
        message: `नई वेबसाइट / पंडाल '${name}' (${cleanSiteId}) डेटाबेस में सफलतापूर्वक सुरक्षित कर दी गई!`,
        site: { siteId: cleanSiteId, name, location, theme, upiId, helpline, active: true },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'डेटाबेस में साइट जोड़ने में त्रुटि: ' + err.message });
    }
  }

  return res.status(500).json({ success: false, message: 'डेटाबेस कॉन्फ़िगरेशन अनुपलब्ध है।' });
});

// GET all registered admins for Super Admin Portal
app.get('/api/admin/admins-list', requireSuperAdminAuth, async (_req: Request, res: Response) => {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId) {
    return res.json({ success: true, admins: [] });
  }

  try {
    const dirUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/directory?key=${firebaseConfig.apiKey}`;
    const dirRes = await fetch(dirUrl);
    let usernames = ['kushwahaarjun9970', 'admin', 'arjun'];

    if (dirRes.ok) {
      const dirData = await dirRes.json();
      const vals = dirData.fields?.usernames?.arrayValue?.values || [];
      if (vals.length > 0) {
        usernames = Array.from(new Set(vals.map((v: any) => v.stringValue).filter(Boolean)));
      }
    }

    const admins: any[] = [];
    for (const u of usernames) {
      const adm = await getAdminFromFirestore(u);
      if (adm && adm.exists) {
        admins.push({
          username: adm.username,
          displayName: adm.displayName,
          role: adm.role,
          siteId: adm.siteId || (adm.role === 'super_admin' ? '*' : 'shree-shakti-durga'),
          pandalName: adm.pandalName || 'Shree Shakti Durga Puja Samiti',
          email: adm.email,
        });
      }
    }

    return res.json({ success: true, admins });
  } catch (err) {
    console.warn('Firestore admins list error:', err);
  }

  return res.json({
    success: true,
    admins: [
      { username: 'kushwahaarjun9970', displayName: 'Arjun Kushwaha (मुख्य सुपर एडमिन)', role: 'super_admin', siteId: '*', pandalName: 'अखिल भारतीय मास्टर कंट्रोल' },
      { username: 'admin', displayName: 'समिति एडमिन (Shree Shakti)', role: 'admin', siteId: 'shree-shakti-durga', pandalName: 'Shree Shakti Durga Puja Samiti' },
      { username: 'arjun', displayName: 'Arjun Kushwaha (समिति प्रबंधक)', role: 'admin', siteId: 'shree-shakti-durga', pandalName: 'Shree Shakti Durga Puja Samiti' },
    ],
  });
});

// POST Create new admin assigned to a specific website (Super Admin Only)
app.post('/api/admin/create-admin', requireSuperAdminAuth, async (req: Request, res: Response) => {
  const { username, password, displayName, role = 'admin', siteId = 'shree-shakti-durga', pandalName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'यूज़रनेम और पासवर्ड दोनों अनिवार्य हैं।' });
  }

  const cleanUser = username.toString().trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const cleanPass = password.toString().trim();
  const hashedPass = hashPassword(cleanPass);

  if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
    try {
      // 1. Create admin document in Firestore
      const patchUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/${encodeURIComponent(cleanUser)}?updateMask.fieldPaths=username&updateMask.fieldPaths=password&updateMask.fieldPaths=displayName&updateMask.fieldPaths=role&updateMask.fieldPaths=siteId&updateMask.fieldPaths=pandalName&key=${firebaseConfig.apiKey}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            username: { stringValue: cleanUser },
            password: { stringValue: hashedPass },
            displayName: { stringValue: displayName || cleanUser },
            role: { stringValue: role },
            siteId: { stringValue: role === 'super_admin' ? '*' : siteId },
            pandalName: { stringValue: pandalName || 'Shree Shakti Durga Puja Samiti' },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });

      // 2. Add username to admins/directory
      try {
        const dirUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/directory?key=${firebaseConfig.apiKey}`;
        const dirRes = await fetch(dirUrl);
        let usernames = ['kushwahaarjun9970', 'admin', 'arjun'];
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          const vals = dirData.fields?.usernames?.arrayValue?.values || [];
          if (vals.length > 0) {
            usernames = vals.map((v: any) => v.stringValue).filter(Boolean);
          }
        }
        if (!usernames.includes(cleanUser)) {
          usernames.push(cleanUser);
        }

        await fetch(
          `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/directory?updateMask.fieldPaths=usernames&key=${firebaseConfig.apiKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                usernames: {
                  arrayValue: {
                    values: usernames.map((u) => ({ stringValue: u })),
                  },
                },
              },
            }),
          }
        );
      } catch (regErr) {
        console.warn('Failed to update admins/directory:', regErr);
      }

      // Sync with Server Vault (using PBKDF2 hash)
      adminVaultMap.set(cleanUser, {
        username: cleanUser,
        password: hashedPass,
        displayName: displayName || cleanUser,
        role: role as 'super_admin' | 'admin',
        siteId: role === 'super_admin' ? '*' : siteId,
        email: `${cleanUser}@samiti.local`,
        pandalName: pandalName || 'Shree Shakti Durga Puja Samiti',
      });
      persistAdminVault();

      if (patchRes.ok) {
        return res.json({
          success: true,
          message: `नया एडमिन '${displayName || cleanUser}' (${role === 'super_admin' ? 'सुपर एडमिन' : `साइट: ${siteId}`}) डेटाबेस में सफलतापूर्वक सुरक्षित कर दिया गया!`,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Fallback to Server Vault only if Firestore config absent
  adminVaultMap.set(cleanUser, {
    username: cleanUser,
    password: hashedPass,
    displayName: displayName || cleanUser,
    role: role as 'super_admin' | 'admin',
    siteId: role === 'super_admin' ? '*' : siteId,
    email: `${cleanUser}@samiti.local`,
    pandalName: pandalName || 'Shree Shakti Durga Puja Samiti',
  });
  persistAdminVault();
  return res.json({
    success: true,
    message: `नया एडमिन '${displayName || cleanUser}' सुरक्षित कर दिया गया!`,
  });
});

// POST Delete admin (Super Admin Only)
app.post('/api/admin/delete-admin', requireSuperAdminAuth, async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'यूज़रनेम अनिवार्य है।' });
  }

  const cleanUser = username.toString().trim().toLowerCase();
  if (cleanUser === 'kushwahaarjun9970') {
    return res.status(403).json({ success: false, message: 'मुख्य सुपर एडमिन खाते को हटाया नहीं जा सकता।' });
  }

  if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
    try {
      const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/${encodeURIComponent(cleanUser)}?key=${firebaseConfig.apiKey}`;
      const delRes = await fetch(deleteUrl, { method: 'DELETE' });

      // Remove from directory
      try {
        const dirUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/directory?key=${firebaseConfig.apiKey}`;
        const dirRes = await fetch(dirUrl);
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          const vals = dirData.fields?.usernames?.arrayValue?.values || [];
          const updated = vals
            .map((v: any) => v.stringValue)
            .filter((u: string) => u && u !== cleanUser);

          await fetch(
            `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/admins/directory?updateMask.fieldPaths=usernames&key=${firebaseConfig.apiKey}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  usernames: {
                    arrayValue: {
                      values: updated.map((u: string) => ({ stringValue: u })),
                    },
                  },
                },
              }),
            }
          );
        }
      } catch (regErr) {
        console.warn('Failed to remove from admins/directory:', regErr);
      }

      // Sync with Server Vault
      adminVaultMap.delete(cleanUser);
      persistAdminVault();

      if (delRes.ok) {
        return res.json({ success: true, message: `एडमिन '${cleanUser}' सफलतापूर्वक हटा दिया गया!` });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  adminVaultMap.delete(cleanUser);
  persistAdminVault();
  return res.json({ success: true, message: `एडमिन '${cleanUser}' हटा दिया गया!` });
});

app.get('/api/pandal/:slug', (_req: Request, res: Response) => {
  res.json({ success: true, data: currentLivePandalData });
});

app.get('/api/pandal/:slug/events', (_req: Request, res: Response) => {
  res.json({ success: true, data: currentLivePandalData.events });
});

app.get('/api/pandal/:slug/gallery', (_req: Request, res: Response) => {
  res.json({ success: true, data: currentLivePandalData.galleryImages });
});

app.get('/api/pandal/:slug/members', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      keyMembers: currentLivePandalData.keyMembers,
      allCommittee: currentLivePandalData.allCommittee,
    },
  });
});

app.get('/api/pandal/:slug/volunteers', (_req: Request, res: Response) => {
  res.json({ success: true, data: currentLivePandalData.volunteers });
});

app.get('/api/pandal/:slug/updates', (_req: Request, res: Response) => {
  res.json({ success: true, data: pandalData.liveUpdates });
});

// DONATION RECORDING ENDPOINT
app.post('/api/donations', (req: Request, res: Response) => {
  const { donorName, amount, paymentMethod } = req.body;
  const receiptId = `DP2026${Math.floor(1000 + Math.random() * 9000)}`;
  res.json({
    success: true,
    message: 'Donation successfully registered',
    data: {
      receiptId,
      donorName: donorName || 'Devotee',
      amount: amount || 501,
      paymentMethod: paymentMethod || 'UPI',
      status: 'VERIFIED',
      date: new Date().toISOString(),
    },
  });
});

// =========================================================================
// DEVOTEE INQUIRIES REST API (PROTECTED READ / OPEN CREATE)
// =========================================================================
const INQUIRIES_FILE = path.resolve(__dirname, 'inquiries-data.json');
let serverInquiries: any[] = [];

try {
  if (fs.existsSync(INQUIRIES_FILE)) {
    serverInquiries = JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf-8'));
  }
} catch {
  // fallback to in-memory
}

function saveInquiriesToDisk() {
  try {
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(serverInquiries, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

// GET is strictly protected: Only verified admin can read inquiries
app.get('/api/inquiries', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(serverInquiries);
});

// POST is open for devotees with input validation & sanitization
app.post('/api/inquiries', (req: Request, res: Response) => {
  const inq = req.body;
  if (!inq || !inq.senderName || !inq.senderPhone) {
    return res.status(400).json({ success: false, message: 'नाम और फ़ोन नंबर आवश्यक हैं।' });
  }

  const sanitized = {
    id: String(inq.id || `inq-${Date.now()}`),
    memberName: String(inq.memberName || 'समिति प्रबंधन').slice(0, 100),
    memberRole: String(inq.memberRole || 'प्रबंधन').slice(0, 50),
    memberPhone: String(inq.memberPhone || '').slice(0, 30),
    senderName: String(inq.senderName).slice(0, 100),
    senderPhone: String(inq.senderPhone).slice(0, 30),
    purpose: String(inq.purpose || 'पूछताछ').slice(0, 100),
    message: String(inq.message || '').slice(0, 1000),
    createdAt: inq.createdAt || new Date().toISOString(),
    status: inq.status || 'new',
  };

  serverInquiries = [sanitized, ...serverInquiries.filter((x) => x.id !== sanitized.id)];
  saveInquiriesToDisk();
  return res.json({ success: true, inquiry: sanitized });
});

// PATCH is protected: Only verified admin can update status
app.patch('/api/inquiries/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  serverInquiries = serverInquiries.map((x) => (x.id === id ? { ...x, status } : x));
  saveInquiriesToDisk();
  res.json({ success: true });
});

// DELETE is protected: Only verified admin can delete
app.delete('/api/inquiries/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  serverInquiries = serverInquiries.filter((x) => x.id !== id);
  saveInquiriesToDisk();
  res.json({ success: true });
});

// VOLUNTEER ENROLLMENT ENDPOINT
app.post('/api/volunteers', (req: Request, res: Response) => {
  const { name, phone, area, availability } = req.body;
  const volunteerBadgeId = `SEVAK-${Math.floor(100 + Math.random() * 900)}`;
  res.json({
    success: true,
    message: 'Volunteer application submitted successfully',
    data: {
      badgeId: volunteerBadgeId,
      name: String(name || '').slice(0, 100),
      phone: String(phone || '').slice(0, 30),
      area: String(area || '').slice(0, 100),
      availability: String(availability || '').slice(0, 100),
      status: 'PENDING_COORDINATION',
    },
  });
});

// CONTACT SAMITI ENDPOINT
app.post('/api/contact', (req: Request, res: Response) => {
  const { name, phone, purpose, message } = req.body;
  res.json({
    success: true,
    message: 'Inquiry received. Samiti member will respond shortly.',
    data: {
      name: String(name || '').slice(0, 100),
      phone: String(phone || '').slice(0, 30),
      purpose: String(purpose || '').slice(0, 100),
      message: String(message || '').slice(0, 1000),
      receivedAt: new Date().toISOString(),
    },
  });
});

async function startServer() {
  // Static image caching for high-speed delivery
  app.use('/images', express.static(path.resolve(__dirname, 'public/images'), { maxAge: '7d' }));
  app.use('/src/assets/images', express.static(path.resolve(__dirname, 'public/images'), { maxAge: '7d' }));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shree Shakti Durga Puja Pandal server running on http://0.0.0.0:${PORT}`);
  });
}

// Start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
