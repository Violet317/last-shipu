-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAtMs" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "AuthCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAtMs" BIGINT NOT NULL,
    "createdAtMs" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAtMs" BIGINT NOT NULL,
    "createdAtMs" BIGINT NOT NULL,
    "revokedAtMs" BIGINT,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "category" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "kcalPer100g" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,
    "updatedAtMs" BIGINT NOT NULL,
    CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "purchasedAtMs" BIGINT NOT NULL,
    "expiresAtMs" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "qty" INTEGER,
    "updatedAtMs" BIGINT NOT NULL,
    CONSTRAINT "PantryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PantryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER,
    "checked" BOOLEAN NOT NULL,
    "updatedAtMs" BIGINT NOT NULL,
    CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "tagsJson" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "stepsJson" TEXT NOT NULL,
    "sourceIngredientsJson" TEXT NOT NULL,
    "createdAtMs" BIGINT NOT NULL,
    CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuthCode_email_expiresAtMs_idx" ON "AuthCode"("email", "expiresAtMs");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAtMs_idx" ON "RefreshToken"("userId", "expiresAtMs");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_category_sort_idx" ON "InventoryItem"("userId", "category", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_nameZh_key" ON "InventoryItem"("userId", "nameZh");

-- CreateIndex
CREATE INDEX "PantryItem_userId_expiresAtMs_idx" ON "PantryItem"("userId", "expiresAtMs");

-- CreateIndex
CREATE INDEX "PantryItem_inventoryId_idx" ON "PantryItem"("inventoryId");

-- CreateIndex
CREATE INDEX "ShoppingItem_userId_checked_updatedAtMs_idx" ON "ShoppingItem"("userId", "checked", "updatedAtMs");

-- CreateIndex
CREATE INDEX "Recipe_userId_createdAtMs_idx" ON "Recipe"("userId", "createdAtMs");
