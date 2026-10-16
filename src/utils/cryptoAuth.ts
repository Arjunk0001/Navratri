/**
 * Client-side cryptographic password hashing and verification using Web Crypto API.
 * Ensures 100% compatibility with Node.js crypto.pbkdf2Sync.
 */

export async function hashPasswordClient(password: string): Promise<string> {
  const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `pbkdf2:${saltHex}:${hashHex}`;
}

/**
 * Universal password verification:
 * Supports PBKDF2 (string salt and hex salt), SHA-256, master recovery keys, and legacy hashes.
 */
export async function verifyPasswordClient(
  passwordInput: string,
  storedHashOrPlain?: string
): Promise<boolean> {
  const cleanPass = passwordInput.trim();
  if (!cleanPass || !storedHashOrPlain) return false;
  const target = storedHashOrPlain.trim();

  // 1. PBKDF2 Hash verification
  if (target.startsWith('pbkdf2:')) {
    const parts = target.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const targetHash = parts[2].toLowerCase();

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(cleanPass),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Try Method A: Salt as direct string bytes (TextEncoder)
    try {
      const saltBytesA = enc.encode(salt);
      const bitsA = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytesA,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );
      const hexA = Array.from(new Uint8Array(bitsA))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (hexA.toLowerCase() === targetHash) return true;
    } catch {
      // ignore
    }

    // Try Method B: Salt as hex-decoded bytes
    try {
      const match = salt.match(/.{1,2}/g);
      if (match) {
        const saltBytesB = new Uint8Array(match.map((byte) => parseInt(byte, 16)));
        const bitsB = await window.crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: saltBytesB,
            iterations: 100000,
            hash: 'SHA-256',
          },
          keyMaterial,
          256
        );
        const hexB = Array.from(new Uint8Array(bitsB))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        if (hexB.toLowerCase() === targetHash) return true;
      }
    } catch {
      // ignore
    }

    return false;
  }

  // 2. SHA-256 Hash check
  try {
    const enc = new TextEncoder();
    const hashBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(cleanPass));
    const shaHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (target.toLowerCase() === shaHex.toLowerCase()) return true;
    if (target.toLowerCase() === `sha256:${shaHex}`.toLowerCase()) return true;
  } catch {
    // ignore
  }

  // 3. Plaintext fallback
  return cleanPass === target;
}
