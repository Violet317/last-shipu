-- CreateTable
CREATE TABLE "ShortcutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedAtMs" BIGINT NOT NULL,
    CONSTRAINT "ShortcutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ShortcutTemplate_userId_sort_idx" ON "ShortcutTemplate"("userId", "sort");
