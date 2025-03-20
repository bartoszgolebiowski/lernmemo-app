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
