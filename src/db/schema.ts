import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Licenses table
export const licenses = sqliteTable('licenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licenseKey: text('license_key').notNull().unique(),
  email: text('email').notNull(),
  product: text('product').notNull().default('NS Toolkit'),
  status: text('status', { enum: ['active', 'revoked', 'expired'] }).notNull().default('active'),
  maxActivations: integer('max_activations').notNull().default(1),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  expiresAt: integer('expires_at'), // null = perpetual
});

// Activations table
export const activations = sqliteTable('activations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licenseId: integer('license_id').notNull().references(() => licenses.id),
  machineFingerprint: text('machine_fingerprint').notNull(),
  activatedAt: integer('activated_at').notNull().$defaultFn(() => Date.now()),
  lastValidatedAt: integer('last_validated_at').notNull().$defaultFn(() => Date.now()),
  deactivatedAt: integer('deactivated_at'), // null = active
});

// Relations
export const licensesRelations = relations(licenses, ({ many }) => ({
  activations: many(activations),
}));

export const activationsRelations = relations(activations, ({ one }) => ({
  license: one(licenses, {
    fields: [activations.licenseId],
    references: [licenses.id],
  }),
}));

// Export types
export type License = typeof licenses.$inferSelect;
export type NewLicense = typeof licenses.$inferInsert;
export type Activation = typeof activations.$inferSelect;
export type NewActivation = typeof activations.$inferInsert;