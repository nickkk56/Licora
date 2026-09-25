CREATE TABLE `activations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`license_id` integer NOT NULL,
	`machine_fingerprint` text NOT NULL,
	`activated_at` integer NOT NULL,
	`last_validated_at` integer NOT NULL,
	`deactivated_at` integer,
	FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`license_key` text NOT NULL,
	`email` text NOT NULL,
	`product` text DEFAULT 'NS Toolkit' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`max_activations` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_license_key_unique` ON `licenses` (`license_key`);