CREATE TABLE "timers" (
	"uuid" UUID NOT NULL DEFAULT uuid_generate_v4(),
	"owner" VARCHAR(255) NOT NULL,
	"name" TEXT NOT NULL,
	"interval" SMALLINT NOT NULL,
	"message" TEXT NOT NULL,
	"enabled" BOOLEAN NOT NULL DEFAULT 'true',
	UNIQUE INDEX "uuid" ("uuid"),
	PRIMARY KEY ("uuid"),
	CONSTRAINT "FRN_OWNER_CHANNEL_USER_ID" FOREIGN KEY ("owner") REFERENCES "channels" ("user_id") ON UPDATE CASCADE ON DELETE CASCADE
);
