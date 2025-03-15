PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flashcard_attachment` (
	`attachment_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_location` text NOT NULL,
	`imported_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_flashcard_attachment`("attachment_id", "user_id", "file_location", "imported_at") SELECT "attachment_id", "user_id", "file_location", "imported_at" FROM `flashcard_attachment`;--> statement-breakpoint
DROP TABLE `flashcard_attachment`;--> statement-breakpoint
ALTER TABLE `__new_flashcard_attachment` RENAME TO `flashcard_attachment`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_flashcard_game` (
	`game_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`start_at` text,
	`completed_at` text,
	`attachment_id` text NOT NULL,
	`cards` integer NOT NULL,
	`questions` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attachment_id`) REFERENCES `flashcard_attachment`(`attachment_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_flashcard_game`("game_id", "user_id", "start_at", "completed_at", "attachment_id", "cards", "questions") SELECT "game_id", "user_id", "start_at", "completed_at", "attachment_id", "cards", "questions" FROM `flashcard_game`;--> statement-breakpoint
DROP TABLE `flashcard_game`;--> statement-breakpoint
ALTER TABLE `__new_flashcard_game` RENAME TO `flashcard_game`;