import { db } from '../db/client.js';
import { licenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Typo-resistant character set: uppercase A-Z (no I, O) + digits 2-9 (no 0, 1)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random segment of the specified length using the typo-resistant charset.
 */
function randomSegment(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return result;
}

/**
 * Generate a new license key in the format PREFIX-XXXX-XXXX-XXXX
 * where each X is a random character from the typo-resistant charset.
 * Collisions are checked against the database and retried automatically.
 */
export async function generateLicenseKey(): Promise<string> {
  const prefix = process.env.LICENSE_KEY_PREFIX || 'LICENSE';

  let key: string;
  let exists: boolean;

  do {
    // Generate a new candidate key
    const segment1 = randomSegment(4);
    const segment2 = randomSegment(4);
    const segment3 = randomSegment(4);
    key = `${prefix}-${segment1}-${segment2}-${segment3}`;

    // Check if this key already exists in the database
    const existing = await db.select().from(licenses).where(eq(licenses.licenseKey, key)).limit(1);
    exists = existing.length > 0;
  } while (exists);

  return key;
}