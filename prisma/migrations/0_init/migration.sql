-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'DELIVERED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('PROFILE', 'FULL_ACCOUNT', 'INVITATION', 'NEW_EMAIL', 'FAMILY');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED', 'EXPIRED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AliasStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'PAUSED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CodeRequestStatus" AS ENUM ('PENDING', 'RECEIVED', 'DELIVERED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REJECTED_BY_PLATFORM', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PasswordMode" AS ENUM ('STATIC', 'RESET_IN_PANEL', 'INVITATION', 'NONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "automationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderPanel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panelUrl" TEXT NOT NULL,
    "panelType" TEXT,
    "instructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "accessType" "AccessType" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "publicName" TEXT NOT NULL,
    "publicPrice" DECIMAL(65,30) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "providerId" TEXT,
    "providerPanelId" TEXT,
    "saleItemId" TEXT,
    "loginEmailEncrypted" TEXT,
    "loginEmailMasked" TEXT,
    "loginEmailHash" TEXT,
    "passwordEncrypted" TEXT,
    "passwordMode" "PasswordMode" NOT NULL DEFAULT 'STATIC',
    "profileNameEncrypted" TEXT,
    "profilePinEncrypted" TEXT,
    "externalLookupIdEncrypted" TEXT,
    "externalReference" TEXT,
    "notes" TEXT,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "employeeId" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "internalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "providerId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "internalCost" DECIMAL(65,30) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "emailAliasId" TEXT,
    "externalMessageId" TEXT,
    "sender" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "bodyPreview" TEXT,
    "bodyEncrypted" TEXT,
    "verificationCodeEncrypted" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeRequest" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "requestedById" TEXT,
    "codeEncrypted" TEXT,
    "status" "CodeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "CodeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAlias" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "localPart" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "destinationEmailEncrypted" TEXT,
    "destinationEmailMasked" TEXT,
    "platformGroup" TEXT,
    "status" "AliasStatus" NOT NULL DEFAULT 'AVAILABLE',
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlias" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "emailAliasId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "providerName" TEXT,
    "platformGroup" TEXT,
    "catchAllEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rotationGroup" TEXT,
    "rotationPriority" INTEGER NOT NULL DEFAULT 0,
    "status" "DomainStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOffer" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "internalCost" DECIMAL(65,30) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_saleItemId_key" ON "InventoryItem"("saleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxMessage_externalMessageId_key" ON "InboxMessage"("externalMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAlias_fullAddress_key" ON "EmailAlias"("fullAddress");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAlias_domainId_localPart_key" ON "EmailAlias"("domainId", "localPart");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAlias_inventoryItemId_emailAliasId_key" ON "InventoryAlias"("inventoryItemId", "emailAliasId");

-- CreateIndex
CREATE UNIQUE INDEX "MailDomain_domain_key" ON "MailDomain"("domain");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPanel" ADD CONSTRAINT "ProviderPanel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_providerPanelId_fkey" FOREIGN KEY ("providerPanelId") REFERENCES "ProviderPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_emailAliasId_fkey" FOREIGN KEY ("emailAliasId") REFERENCES "EmailAlias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeRequest" ADD CONSTRAINT "CodeRequest_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAlias" ADD CONSTRAINT "EmailAlias_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "MailDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlias" ADD CONSTRAINT "InventoryAlias_emailAliasId_fkey" FOREIGN KEY ("emailAliasId") REFERENCES "EmailAlias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlias" ADD CONSTRAINT "InventoryAlias_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOffer" ADD CONSTRAINT "ProviderOffer_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOffer" ADD CONSTRAINT "ProviderOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

