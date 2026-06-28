-- Phase 4 cleanup: remove legacy per-provider API key fields.
-- Drama now reads exclusively from llmConfigs.

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "llmConfigs" TEXT
);

INSERT INTO "new_User" ("id", "email", "passwordHash", "name", "avatar", "createdAt", "updatedAt", "llmConfigs")
SELECT "id", "email", "passwordHash", "name", "avatar", "createdAt", "updatedAt", "llmConfigs" FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
