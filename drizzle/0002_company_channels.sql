CREATE TABLE `channelAuthFlows` (
	`id` varchar(64) NOT NULL,
	`companyId` int NOT NULL,
	`payload` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `channelAuthFlows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `channelResourceClaims` (
	`resource` varchar(191) NOT NULL,
	`companyId` int NOT NULL,
	CONSTRAINT `channelResourceClaims_resource` PRIMARY KEY(`resource`)
);
--> statement-breakpoint
CREATE TABLE `companyChannels` (
	`id` varchar(36) NOT NULL,
	`companyId` int NOT NULL,
	`type` varchar(16) NOT NULL,
	`externalId` varchar(191) NOT NULL,
	`socialSlot` varchar(64),
	`name` varchar(150) NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`pageId` varchar(191),
	`businessAccountId` varchar(191),
	`tokenEncrypted` text NOT NULL,
	`status` varchar(32) NOT NULL,
	`lastVerifiedAt` timestamp,
	`lastWebhookAt` timestamp,
	CONSTRAINT `companyChannels_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_channel_identity` UNIQUE(`type`,`externalId`),
	CONSTRAINT `uq_company_social_slot` UNIQUE(`socialSlot`)
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `channelId` varchar(36);--> statement-breakpoint
ALTER TABLE `clients` ADD `externalContactId` varchar(191);--> statement-breakpoint
ALTER TABLE `whatsappMessages` ADD `channelId` varchar(36);--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `uq_client_channel_contact` UNIQUE(`channelId`,`externalContactId`);--> statement-breakpoint
ALTER TABLE `whatsappMessages` ADD CONSTRAINT `uq_channel_message` UNIQUE(`channelId`,`externalId`);--> statement-breakpoint
ALTER TABLE `channelAuthFlows` ADD CONSTRAINT `channelAuthFlows_companyId_users_id_fk` FOREIGN KEY (`companyId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `channelResourceClaims` ADD CONSTRAINT `channelResourceClaims_companyId_users_id_fk` FOREIGN KEY (`companyId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `companyChannels` ADD CONSTRAINT `companyChannels_companyId_users_id_fk` FOREIGN KEY (`companyId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_channel_company` ON `companyChannels` (`companyId`);