CREATE TABLE `user_stripe_mapping` (
	`user_id` text PRIMARY KEY NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
