CREATE TABLE `user_action` (
	`id` text,
	`user_id` text(255) NOT NULL,
	`action` text(255) NOT NULL,
	`created_at` text,
	PRIMARY KEY(`id`, `created_at`)
);
