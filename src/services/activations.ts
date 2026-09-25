import { db } from '../db/client.js';
import { activations, licenses } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { findByKey } from './licenses.js';

/**
 * Activate a license for a machine fingerprint.
 * - Checks license exists, is active, and not expired
 * - Enforces activation limit
 * - Idempotent: re-activating the same fingerprint succeeds without double-counting
 */
export async function activate(licenseKey: string, machineFingerprint: string) {
  // Find the license
  const license = await findByKey(licenseKey);
  if (!license) {
    throw { code: 'INVALID_KEY', message: 'License key not found' };
  }

  if (license.status !== 'active') {
    throw { code: 'LICENSE_REVOKED', message: 'License has been revoked' };
  }

  // Check expiry
  if (license.expiresAt !== null && license.expiresAt < Date.now()) {
    throw { code: 'LICENSE_EXPIRED', message: 'License has expired' };
  }

  // Check if this fingerprint is already activated (idempotency)
  const existingResult = await db.select().from(activations).where(
    and(
      eq(activations.licenseId, license.id),
      eq(activations.machineFingerprint, machineFingerprint),
      isNull(activations.deactivatedAt)
    )
  ).limit(1);
  const existingActivation = existingResult[0] ?? null;

  if (existingActivation) {
    // Already activated — update last validated and return success
    const updated = await db
      .update(activations)
      .set({ lastValidatedAt: Date.now() })
      .where(eq(activations.id, existingActivation.id))
      .returning();
    return { activation: updated[0], license };
  }

  // Count active activations for this license
  const activeActivations = await db.select().from(activations).where(
    and(
      eq(activations.licenseId, license.id),
      isNull(activations.deactivatedAt)
    )
  );

  if (activeActivations.length >= license.maxActivations) {
    throw { code: 'ACTIVATION_LIMIT_REACHED', message: 'Activation limit reached for this license' };
  }

  // Create new activation
  const result = await db
    .insert(activations)
    .values({
      licenseId: license.id,
      machineFingerprint,
    })
    .returning();

  return { activation: result[0], license };
}

/**
 * Validate a license activation.
 * - Checks license exists, is active, and not expired
 * - Checks an active activation exists for this fingerprint
 * - Updates lastValidatedAt
 */
export async function validate(licenseKey: string, machineFingerprint: string) {
  // Find the license
  const license = await findByKey(licenseKey);
  if (!license) {
    throw { code: 'INVALID_KEY', message: 'License key not found' };
  }

  if (license.status !== 'active') {
    throw { code: 'LICENSE_REVOKED', message: 'License has been revoked' };
  }

  // Check expiry
  if (license.expiresAt !== null && license.expiresAt < Date.now()) {
    throw { code: 'LICENSE_EXPIRED', message: 'License has expired' };
  }

  // Check if this fingerprint has an active activation
  const activationResult = await db.select().from(activations).where(
    and(
      eq(activations.licenseId, license.id),
      eq(activations.machineFingerprint, machineFingerprint),
      isNull(activations.deactivatedAt)
    )
  ).limit(1);
  const activation = activationResult[0] ?? null;

  if (!activation) {
    throw { code: 'NOT_ACTIVATED', message: 'This machine is not activated for this license' };
  }

  // Update last validated timestamp
  const updated = await db
    .update(activations)
    .set({ lastValidatedAt: Date.now() })
    .where(eq(activations.id, activation.id))
    .returning();

  return { valid: true, activation: updated[0], license };
}

/**
 * Deactivate a license for a machine fingerprint (soft deactivation).
 * Frees up an activation slot.
 */
export async function deactivate(licenseKey: string, machineFingerprint: string) {
  // Find the license
  const license = await findByKey(licenseKey);
  if (!license) {
    throw { code: 'INVALID_KEY', message: 'License key not found' };
  }

  // Find the activation
  const activationResult = await db.select().from(activations).where(
    and(
      eq(activations.licenseId, license.id),
      eq(activations.machineFingerprint, machineFingerprint),
      isNull(activations.deactivatedAt)
    )
  ).limit(1);
  const activation = activationResult[0] ?? null;

  if (!activation) {
    throw { code: 'NOT_ACTIVATED', message: 'This machine is not activated for this license' };
  }

  // Soft deactivate
  const updated = await db
    .update(activations)
    .set({ deactivatedAt: Date.now() })
    .where(eq(activations.id, activation.id))
    .returning();

  return { deactivated: updated[0], license };
}