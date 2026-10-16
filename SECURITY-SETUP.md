# Security setup — read before deployment

This archive deliberately excludes `.server-admin-vault.json` and has no built-in/default admin credentials. The server fails closed if the private vault is missing.

## Preserve existing admin accounts
1. Retrieve `.server-admin-vault.json` only from a trusted current server backup, if you have one. Never include it in a public ZIP, repository, or email.
2. Upload it using your hosting provider's private file/secret mechanism, with filesystem permissions restricted to the app account.
3. If no trusted backup exists, create fresh admin accounts with new unique passwords and correct roles/site IDs; do not restore default credentials.
4. Set `ALLOWED_ORIGINS` to your exact production origin(s), comma-separated, e.g. `https://your-domain.example`.
5. Deploy `firestore.rules` in Firebase Console. Then test public pages, Admin and Super Admin login, password changes, and dashboard actions before going live.

## Notes
- Password changes are stored in the private server vault. Use persistent storage on the host; ephemeral filesystems may lose password changes and visitor counts on restart.
- Firestore admin documents are now private to the authenticated allow-listed Super Admin. Username/password login uses the server-side vault.
- Run `npm run lint` and `npm run build` before production. These edits are not a substitute for a live penetration test.
