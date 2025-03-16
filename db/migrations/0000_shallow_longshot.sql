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
	`attachment_id` text NOT NULL,
	`cards` integer NOT NULL,
	`questions` integer NOT NULL,
	FOREIGN KEY (`attachment_id`) REFERENCES `flashcard_attachment`(`attachment_id`) ON UPDATE no action ON DELETE no action
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
	`target_language` text NOT NULL
);
