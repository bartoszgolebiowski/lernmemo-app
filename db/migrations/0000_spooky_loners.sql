CREATE TABLE `flashcard_attachment` (
	`attachment_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_location` text NOT NULL,
	`imported_at` text,
	`deactivated_at` text
);
--> statement-breakpoint
CREATE TABLE `flashcard_game` (
	`game_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text,
	`completed_at` text,
	`cards` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flashcard_game_answer` (
	`answer_id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`translation_id` text NOT NULL,
	`selected_translation_id` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `flashcard_game`(`game_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`translation_id`) REFERENCES `flashcard_translation`(`translation_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`selected_translation_id`) REFERENCES `flashcard_translation`(`translation_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flashcard_game_attachment` (
	`game_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	PRIMARY KEY(`game_id`, `attachment_id`),
	FOREIGN KEY (`game_id`) REFERENCES `flashcard_game`(`game_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attachment_id`) REFERENCES `flashcard_attachment`(`attachment_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flashcard_game_translation` (
	`game_id` text NOT NULL,
	`translation_id` text NOT NULL,
	PRIMARY KEY(`game_id`, `translation_id`),
	FOREIGN KEY (`game_id`) REFERENCES `flashcard_game`(`game_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`translation_id`) REFERENCES `flashcard_translation`(`translation_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flashcard_import` (
	`attachment_id` text,
	`translation_id` text,
	PRIMARY KEY(`attachment_id`, `translation_id`),
	FOREIGN KEY (`attachment_id`) REFERENCES `flashcard_attachment`(`attachment_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`translation_id`) REFERENCES `flashcard_translation`(`translation_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flashcard_translation` (
	`translation_id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`translation` text NOT NULL,
	`target_language` text NOT NULL,
	`deactivated_at` text
);
--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`plan` text,
	`expires_at` text,
	`subscription_group_id` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_action` (
	`id` text,
	`user_id` text(255) NOT NULL,
	`action` text(255) NOT NULL,
	`created_at` text,
	PRIMARY KEY(`id`, `created_at`)
);
--> statement-breakpoint
CREATE TABLE `user_stripe_mapping` (
	`user_id` text PRIMARY KEY NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
