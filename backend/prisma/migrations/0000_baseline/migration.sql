-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Cargo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "permissoes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contador" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Contador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HistoricoMovimentacao" (
    "id" SERIAL NOT NULL,
    "codigoItem" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "codigoAnterior" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "palletDestino" TEXT,
    "palletOrigem" TEXT,
    "usuarioId" INTEGER,
    "bipadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "palletAlvo" TEXT,

    CONSTRAINT "HistoricoMovimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundFull" (
    "id" SERIAL NOT NULL,
    "numeroFrete" TEXT,
    "nomePallet" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "motoristaId" INTEGER,
    "veiculoId" INTEGER,

    CONSTRAINT "InboundFull_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundSku" (
    "id" SERIAL NOT NULL,
    "inboundId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidadeTotal" INTEGER NOT NULL,
    "quantidadeBipada" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "variacoes" JSONB,
    "leituras" JSONB,

    CONSTRAINT "InboundSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Motorista" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motorista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pallet" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "rua" TEXT,
    "estrutura" TEXT,
    "nivel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT,

    CONSTRAINT "Pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProdutoPallet" (
    "id" SERIAL NOT NULL,
    "codigoItem" TEXT NOT NULL,
    "palletId" INTEGER NOT NULL,
    "bipadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER,

    CONSTRAINT "ProdutoPallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recebimento" (
    "id" SERIAL NOT NULL,
    "identificacao" TEXT NOT NULL,
    "numeroNota" TEXT,
    "serieNota" TEXT,
    "chaveAcesso" TEXT,
    "fornecedor" TEXT,
    "fornecedorCnpj" TEXT,
    "valorTotal" DOUBLE PRECISION,
    "dataEmissao" TIMESTAMP(3),
    "dataAgendada" TIMESTAMP(3),
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',
    "xmlOriginal" TEXT,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recebimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecebimentoItem" (
    "id" SERIAL NOT NULL,
    "recebimentoId" INTEGER NOT NULL,
    "numItem" INTEGER NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "ean" TEXT,
    "eanTributavel" TEXT,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT,
    "cfop" TEXT,
    "unidade" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorUnitario" DOUBLE PRECISION,
    "valorTotal" DOUBLE PRECISION,
    "precisaConferencia" BOOLEAN NOT NULL DEFAULT true,
    "quantidadeConferida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "leituras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecebimentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "precisaMudarSenha" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargoId" INTEGER,
    "sessaoToken" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Veiculo" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modelo" TEXT NOT NULL,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_nome_key" ON "public"."Cargo"("nome" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Contador_chave_key" ON "public"."Contador"("chave" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Pallet_numero_key" ON "public"."Pallet"("numero" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoPallet_codigoItem_key" ON "public"."ProdutoPallet"("codigoItem" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Recebimento_chaveAcesso_key" ON "public"."Recebimento"("chaveAcesso" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "public"."Usuario"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_placa_key" ON "public"."Veiculo"("placa" ASC);

-- AddForeignKey
ALTER TABLE "public"."HistoricoMovimentacao" ADD CONSTRAINT "HistoricoMovimentacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundFull" ADD CONSTRAINT "InboundFull_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "public"."Motorista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundFull" ADD CONSTRAINT "InboundFull_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundFull" ADD CONSTRAINT "InboundFull_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "public"."Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundSku" ADD CONSTRAINT "InboundSku_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES "public"."InboundFull"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProdutoPallet" ADD CONSTRAINT "ProdutoPallet_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "public"."Pallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProdutoPallet" ADD CONSTRAINT "ProdutoPallet_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recebimento" ADD CONSTRAINT "Recebimento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecebimentoItem" ADD CONSTRAINT "RecebimentoItem_recebimentoId_fkey" FOREIGN KEY ("recebimentoId") REFERENCES "public"."Recebimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "public"."Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

