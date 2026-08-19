CREATE TABLE `activeSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendantId` int NOT NULL,
	`sessionToken` varchar(255) NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `activeSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'available',
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`password` varchar(255) NOT NULL,
	`phone` varchar(32),
	`position` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastIp` varchar(64),
	`lastDevice` text,
	`sessionToken` varchar(255),
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audioRecordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int,
	`interactionId` int,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100) NOT NULL DEFAULT 'audio/webm',
	`duration` int,
	`fileSize` int,
	`transcription` text,
	`transcriptionStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audioRecordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`company` varchar(255),
	`position` varchar(255),
	`address` text,
	`notes` text,
	`tags` text,
	`source` varchar(100),
	`clientStatus` enum('active','inactive','prospect') NOT NULL DEFAULT 'prospect',
	`assignedAttendantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contactLabels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`labelId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contactLabels_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_contactLabels_clientId_labelId` UNIQUE(`clientId`,`labelId`)
);
--> statement-breakpoint
CREATE TABLE `flowAnalytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowId` int NOT NULL,
	`userId` int NOT NULL,
	`totalExecutions` int NOT NULL DEFAULT 0,
	`successfulExecutions` int NOT NULL DEFAULT 0,
	`failedExecutions` int NOT NULL DEFAULT 0,
	`totalResponses` int NOT NULL DEFAULT 0,
	`responseRate` int NOT NULL DEFAULT 0,
	`avgResponseTime` int NOT NULL DEFAULT 0,
	`avgCompletionTime` int NOT NULL DEFAULT 0,
	`lastExecutedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flowAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flowExecutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowId` int NOT NULL,
	`clientId` int NOT NULL,
	`executionStatus` enum('started','in_progress','completed','failed') NOT NULL DEFAULT 'started',
	`totalSteps` int NOT NULL,
	`completedSteps` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flowExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flowResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowExecutionId` int NOT NULL,
	`flowStepId` int NOT NULL,
	`clientId` int NOT NULL,
	`responseText` text,
	`responseTime` int,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flowResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flowSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowId` int NOT NULL,
	`stepType` enum('delay','wait_response','randomizer','audio','contact','document','media','text') NOT NULL,
	`stepOrder` int NOT NULL,
	`delaySeconds` int,
	`mediaAudioId` int,
	`mediaFileId` int,
	`mediaDocumentId` int,
	`mediaTextId` int,
	`randomOptions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flowSteps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`triggerType` enum('message_contains','message_equals','message_starts_with','message_ends_with','keyword') NOT NULL,
	`triggerValue` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int NOT NULL,
	`opportunityId` int,
	`interactionType` enum('call','email','meeting','note','whatsapp','audio') NOT NULL DEFAULT 'note',
	`subject` varchar(255),
	`content` text,
	`audioUrl` text,
	`transcription` text,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#3B82F6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaAudios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100) NOT NULL DEFAULT 'audio/mpeg',
	`duration` int,
	`fileSize` int,
	`sendAsForwarded` boolean NOT NULL DEFAULT false,
	`sendAsViewOnce` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaAudios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileType` enum('image','video') NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int,
	`sendAsViewOnce` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaTexts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaTexts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`value` bigint DEFAULT 0,
	`stage` enum('lead','contact','proposal','negotiation','closed_won','closed_lost') NOT NULL DEFAULT 'lead',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`expectedCloseDate` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sendCounters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`counterType` enum('audios','medias','documents','messages','funnis','flows') NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`maxLimit` int NOT NULL DEFAULT 20,
	`resetDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sendCounters_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_sendCounters_userId_counterType` UNIQUE(`userId`,`counterType`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_settings_userId_settingKey` UNIQUE(`userId`,`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int,
	`opportunityId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueDate` timestamp,
	`completed` boolean NOT NULL DEFAULT false,
	`taskPriority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`taskType` enum('call','email','meeting','follow_up','other') NOT NULL DEFAULT 'other',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`password` varchar(255),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`isActive` boolean NOT NULL DEFAULT true,
	`phone` varchar(32),
	`avatarUrl` text,
	`preferences` text,
	`companyName` varchar(255),
	`maxAttendants` int NOT NULL DEFAULT 5,
	`whatsappStatus` varchar(32) NOT NULL DEFAULT 'disconnected',
	`whatsappNumber` varchar(32),
	`whatsappApiUrl` text,
	`whatsappApiKey` text,
	`whatsappQrCode` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `whatsappMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` int,
	`attendantId` int,
	`direction` enum('inbound','outbound') NOT NULL,
	`message` text,
	`mediaUrl` text,
	`whatsappStatus` enum('sent','delivered','read','failed') NOT NULL DEFAULT 'sent',
	`externalId` varchar(255),
	`transcription` text,
	`transcriptionStatus` varchar(50),
	`sentiment` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activeSessions` ADD CONSTRAINT `activeSessions_attendantId_attendants_id_fk` FOREIGN KEY (`attendantId`) REFERENCES `attendants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendants` ADD CONSTRAINT `attendants_companyId_users_id_fk` FOREIGN KEY (`companyId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audioRecordings` ADD CONSTRAINT `audioRecordings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audioRecordings` ADD CONSTRAINT `audioRecordings_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audioRecordings` ADD CONSTRAINT `audioRecordings_interactionId_interactions_id_fk` FOREIGN KEY (`interactionId`) REFERENCES `interactions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactLabels` ADD CONSTRAINT `contactLabels_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactLabels` ADD CONSTRAINT `contactLabels_labelId_labels_id_fk` FOREIGN KEY (`labelId`) REFERENCES `labels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowAnalytics` ADD CONSTRAINT `flowAnalytics_flowId_flows_id_fk` FOREIGN KEY (`flowId`) REFERENCES `flows`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowAnalytics` ADD CONSTRAINT `flowAnalytics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowExecutions` ADD CONSTRAINT `flowExecutions_flowId_flows_id_fk` FOREIGN KEY (`flowId`) REFERENCES `flows`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowExecutions` ADD CONSTRAINT `flowExecutions_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowResponses` ADD CONSTRAINT `flowResponses_flowExecutionId_flowExecutions_id_fk` FOREIGN KEY (`flowExecutionId`) REFERENCES `flowExecutions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowResponses` ADD CONSTRAINT `flowResponses_flowStepId_flowSteps_id_fk` FOREIGN KEY (`flowStepId`) REFERENCES `flowSteps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowResponses` ADD CONSTRAINT `flowResponses_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flowSteps` ADD CONSTRAINT `flowSteps_flowId_flows_id_fk` FOREIGN KEY (`flowId`) REFERENCES `flows`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flows` ADD CONSTRAINT `flows_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interactions` ADD CONSTRAINT `interactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interactions` ADD CONSTRAINT `interactions_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interactions` ADD CONSTRAINT `interactions_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labels` ADD CONSTRAINT `labels_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mediaAudios` ADD CONSTRAINT `mediaAudios_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mediaDocuments` ADD CONSTRAINT `mediaDocuments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mediaFiles` ADD CONSTRAINT `mediaFiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mediaTexts` ADD CONSTRAINT `mediaTexts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sendCounters` ADD CONSTRAINT `sendCounters_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_opportunityId_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `opportunities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsappMessages` ADD CONSTRAINT `whatsappMessages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsappMessages` ADD CONSTRAINT `whatsappMessages_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsappMessages` ADD CONSTRAINT `whatsappMessages_attendantId_attendants_id_fk` FOREIGN KEY (`attendantId`) REFERENCES `attendants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_activeSessions_sessionToken` ON `activeSessions` (`sessionToken`);--> statement-breakpoint
CREATE INDEX `idx_attendants_companyId` ON `attendants` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_attendants_email` ON `attendants` (`email`);--> statement-breakpoint
CREATE INDEX `idx_clients_userId` ON `clients` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_clients_assignedAttendantId` ON `clients` (`assignedAttendantId`);--> statement-breakpoint
CREATE INDEX `idx_clients_userId_status` ON `clients` (`userId`,`clientStatus`);--> statement-breakpoint
CREATE INDEX `idx_flowExecutions_flowId` ON `flowExecutions` (`flowId`);--> statement-breakpoint
CREATE INDEX `idx_flowSteps_flowId` ON `flowSteps` (`flowId`);--> statement-breakpoint
CREATE INDEX `idx_flows_userId` ON `flows` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_interactions_clientId` ON `interactions` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_userId` ON `opportunities` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_clientId` ON `opportunities` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_stage` ON `opportunities` (`stage`);--> statement-breakpoint
CREATE INDEX `idx_tasks_userId_completed` ON `tasks` (`userId`,`completed`);--> statement-breakpoint
CREATE INDEX `idx_tasks_dueDate` ON `tasks` (`dueDate`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_whatsappMessages_userId_clientId` ON `whatsappMessages` (`userId`,`clientId`);--> statement-breakpoint
CREATE INDEX `idx_whatsappMessages_externalId` ON `whatsappMessages` (`externalId`);