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
