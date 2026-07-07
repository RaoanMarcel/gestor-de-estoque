-- CreateTable
CREATE TABLE "Pallet" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "rua" TEXT,
    "estrutura" TEXT,
    "nivel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoPallet" (
    "id" SERIAL NOT NULL,
    "codigoItem" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "palletId" INTEGER NOT NULL,
    "bipadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProdutoPallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pallet_numero_key" ON "Pallet"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoPallet_palletId_codigoItem_key" ON "ProdutoPallet"("palletId", "codigoItem");

-- AddForeignKey
ALTER TABLE "ProdutoPallet" ADD CONSTRAINT "ProdutoPallet_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
