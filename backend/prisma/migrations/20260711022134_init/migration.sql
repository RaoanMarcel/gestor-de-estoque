/*
  Warnings:

  - You are about to drop the column `quantidade` on the `ProdutoPallet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[codigoItem]` on the table `ProdutoPallet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProdutoPallet_palletId_codigoItem_key";

-- AlterTable
ALTER TABLE "Pallet" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "tipo" TEXT;

-- AlterTable
ALTER TABLE "ProdutoPallet" DROP COLUMN "quantidade";

-- CreateTable
CREATE TABLE "HistoricoMovimentacao" (
    "id" SERIAL NOT NULL,
    "codigoItem" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "palletAlvo" TEXT NOT NULL,
    "bipadoEm" TIMESTAMP(3),

    CONSTRAINT "HistoricoMovimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "precisaMudarSenha" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contador" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Contador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Contador_chave_key" ON "Contador"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoPallet_codigoItem_key" ON "ProdutoPallet"("codigoItem");
