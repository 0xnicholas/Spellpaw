-- Phase 4: Replace per-provider LLM fields with capability-grouped llmConfigs

-- AlterTable
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "openaiApiKey" TEXT,
    "doubaoApiKey" TEXT,
    "minimaxApiKey" TEXT,
    "llmConfigs" TEXT
);

-- Copy data from old table
INSERT INTO "new_User" ("id", "email", "passwordHash", "name", "avatar", "createdAt", "updatedAt", "openaiApiKey", "doubaoApiKey", "minimaxApiKey", "llmConfigs")
SELECT "id", "email", "passwordHash", "name", "avatar", "createdAt", "updatedAt", "openaiApiKey", "doubaoApiKey", "minimaxApiKey", NULL FROM "User";

-- Drop old, rename new
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

-- Re-create indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
