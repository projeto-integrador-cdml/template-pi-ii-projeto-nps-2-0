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
	`clientId` int NOT NULL,
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
ALTER TABLE `clients` ADD `maxAttendants` int DEFAULT 1 NOT NULL;