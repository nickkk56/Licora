import { db } from '../db/client.js';
import { licenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateLicenseKey } from './keygen.js';

interface CreateLicenseInput {
  email: string;
  product?: string;
  maxActivations?: number;
  expiresAt?: number | null; // Unix ms timestamp, null = perpetual
}

/**
 * Create a new license with an auto-generated key.
 */
export async function createLicense(input: CreateLicenseInput) {
  const licenseKey = await generateLicenseKey();

  const result = await db
    .insert(licenses)
    .values({
      licenseKey,
      email: input.email,
      product: input.product || process.env.PRODUCT_NAME || 'NS Toolkit',
      maxActivations: input.maxActivations ?? 1,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();

  return result[0];
}

/**
 * Find a license by its key.
 */
export async function findByKey(licenseKey: string) {
  const result = await db.select().from(licenses).where(eq(licenses.licenseKey, licenseKey)).limit(1);
  return result[0] ?? null;
}

/**
 * Get a license by its ID.
 */
export async function getLicenseById(id: number) {
  const result = await db.select().from(licenses).where(eq(licenses.id, id)).limit(1);
  return result[0] ?? null;
}

/**
 * List all licenses.
 */
export async function listLicenses() {
  return db.select().from(licenses);
}

/**
 * Revoke a license by ID.
 */
export async function revokeLicense(id: number) {
  const result = await db
    .update(licenses)
    .set({ status: 'revoked' })
    .where(eq(licenses.id, id))
    .returning();

  return result[0];
}