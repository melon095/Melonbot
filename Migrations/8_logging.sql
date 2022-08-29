CREATE SCHEMA logs;

CREATE TABLE logs."commands_execution" (
    "id" SERIAL NOT NULL,
	"user_id" VARCHAR(255) NOT NULL,
	"username" VARCHAR(255) NOT NULL,
	"success" BOOLEAN NOT NULL,
	"command" TEXT NOT NULL,
	"args" TEXT[] NOT NULL,
	"result" TEXT NOT NULL,
	CONSTRAINT "commands_id_PRIMARY" PRIMARY KEY ("id"),
	CONSTRAINT "commands_id_UNIQUE" UNIQUE ("id")
);

CREATE TABLE logs."web_request" (
    "id" SERIAL NOT NULL,
    "method" VARCHAR(25) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_ip" VARCHAR(100) NOT NULL,
    "headers" TEXT NULL DEFAULT NULL,
    "query" TEXT NULL DEFAULT NULL,
    "body" TEXT NULL DEFAULT NULL,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "web_request_id_PRIMARY" PRIMARY KEY ("id"),
	CONSTRAINT "web_request_id_UNIQUE" UNIQUE ("id")
)