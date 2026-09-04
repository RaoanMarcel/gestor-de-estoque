
export const RMA_STATUS = {
  ABERTO: 'ABERTO',
  AGUARDANDO_RETORNO: 'AGUARDANDO_RETORNO',
  EM_CONFERENCIA: 'EM_CONFERENCIA',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
} as const;
export type RmaStatus = (typeof RMA_STATUS)[keyof typeof RMA_STATUS];

export const DESFECHO = {
  PENDENTE: 'PENDENTE',
  TROCA: 'TROCA',
  CONSERTO: 'CONSERTO',
  CREDITO: 'CREDITO',
  DESCARTE: 'DESCARTE',
} as const;
export type Desfecho = (typeof DESFECHO)[keyof typeof DESFECHO];
export const DESFECHOS_FINAIS = [DESFECHO.TROCA, DESFECHO.CONSERTO, DESFECHO.CREDITO, DESFECHO.DESCARTE];
export const DESFECHOS_RETORNO = [DESFECHO.TROCA, DESFECHO.CONSERTO];

export const DIRECAO_NOTA = { ENTRADA: 'ENTRADA', SAIDA: 'SAIDA' } as const;
export const TIPO_NOTA = {
  REMESSA: 'REMESSA',
  DEVOLUCAO: 'DEVOLUCAO',
  RETORNO: 'RETORNO',
  OUTRA: 'OUTRA',
} as const;

export const DESTINO_ESTOQUE = { TRIAGEM: 'TRIAGEM', FANTASMA_NOVO: 'FANTASMA_NOVO' } as const;

const pad = (n: number) => String(n).padStart(4, '0');

export async function proximoNumeroRma(tx: any, tenantId: number): Promise<string> {
  const c = await tx.contador.upsert({
    where: { tenantId_chave: { tenantId, chave: 'RMA' } },
    update: { valor: { increment: 1 } },
    create: { tenantId, chave: 'RMA', valor: 1 },
  });
  return `RMA-${pad(c.valor)}`;
}

export async function proximoNumeroPalletRma(tx: any, tenantId: number): Promise<string> {
  const c = await tx.contador.upsert({
    where: { tenantId_chave: { tenantId, chave: 'PALLET_RMA' } },
    update: { valor: { increment: 1 } },
    create: { tenantId, chave: 'PALLET_RMA', valor: 1 },
  });
  return `PLT-RMA-${pad(c.valor)}`;
}

export const FORNECEDOR_DEMO = 'Fornecedor Demonstração';

const ITENS_DEMO = [
  { codigoTriagem: 'DEMO-01', identificador: '293040025386', tipoIdentificador: 'SERIE', produtoNome: 'Nobreak SMS Tech 1200VA Entrada Bivolt e Saída 115V 29304', produtoCodigo: '013207' },
  { codigoTriagem: 'DEMO-02', identificador: '292020135885', tipoIdentificador: 'SERIE', produtoNome: 'Nobreak SMS Lite 600VA Entrada Bivolt Saída 115V 29202', produtoCodigo: '013196' },
  { codigoTriagem: 'DEMO-03', identificador: '294030008147', tipoIdentificador: 'SERIE', produtoNome: 'Nobreak SMS Pro 1800VA Entrada e Saída Bivolt Wi-Fi 29403', produtoCodigo: '013722' },
  { codigoTriagem: 'DEMO-04', identificador: '293000040390', tipoIdentificador: 'SERIE', produtoNome: 'Nobreak SMS Tech 600VA Entrada Bivolt Saída 115V 29300', produtoCodigo: '013198' },
  { codigoTriagem: 'DEMO-05', identificador: '7898100848279', tipoIdentificador: 'EAN', produtoNome: 'Nobreak SMS Pro 1500VA Entrada e Saída Bivolt 29401', produtoCodigo: '013199' },
  { codigoTriagem: 'DEMO-06', identificador: '291030044210', tipoIdentificador: 'SERIE', produtoNome: 'Nobreak SMS Station 1200VA Entrada Bivolt Saída 115V 29103', produtoCodigo: '013205' },
];

export async function semearDemo(tx: any, rmaId: number, tenantId: number) {
  await tx.rmaItem.deleteMany({ where: { rmaId } });
  await tx.rmaNota.deleteMany({ where: { rmaId } });
  await tx.rmaAnotacao.deleteMany({ where: { rmaId } });

  await tx.rmaItem.createMany({
    data: ITENS_DEMO.map((i) => ({ ...i, rmaId, tenantId, desfecho: DESFECHO.PENDENTE })),
  });
  await tx.rmaNota.create({
    data: {
      rmaId, tenantId,
      direcao: DIRECAO_NOTA.SAIDA, tipo: TIPO_NOTA.REMESSA,
      numero: '1845637', serie: '5', natureza: 'Simples remessa',
      dataEmissao: new Date(), statusNota: 'SIMULADA',
      chaveAcesso: `DEMO-${rmaId}-REMESSA`,
    },
  });
  await tx.rma.update({
    where: { id: rmaId },
    data: { status: RMA_STATUS.AGUARDANDO_RETORNO, finalizadoEm: null, canhoto: null },
  });
}

export async function simularRetornoDemo(tx: any, rmaId: number, tenantId: number) {
  const jaTem = await tx.rmaNota.findFirst({ where: { rmaId, direcao: DIRECAO_NOTA.ENTRADA } });
  if (jaTem) return;
  const voltaram = ITENS_DEMO.slice(0, 5);
  await tx.rmaNota.create({
    data: {
      rmaId, tenantId,
      direcao: DIRECAO_NOTA.ENTRADA, tipo: TIPO_NOTA.RETORNO,
      numero: '44215', serie: '1', natureza: 'Retorno de mercadoria',
      dataEmissao: new Date(), statusNota: 'SIMULADA',
      chaveAcesso: `DEMO-${rmaId}-RETORNO`,
      itens: voltaram.map((i) => ({ descricao: i.produtoNome, codigo: i.produtoCodigo, quantidade: 1 })),
    },
  });
  await tx.rma.update({ where: { id: rmaId }, data: { status: RMA_STATUS.EM_CONFERENCIA } });
}

export function classificarNota(cab: { naturezaOperacao: string | null; tipoOperacao: string | null }) {
  const nat = (cab.naturezaOperacao || '').toLowerCase();
  const entrada = cab.tipoOperacao === '0';

  if (entrada) return { direcao: DIRECAO_NOTA.ENTRADA, tipo: TIPO_NOTA.RETORNO };
  if (nat.includes('devolu')) return { direcao: DIRECAO_NOTA.SAIDA, tipo: TIPO_NOTA.DEVOLUCAO };
  if (nat.includes('remessa')) return { direcao: DIRECAO_NOTA.SAIDA, tipo: TIPO_NOTA.REMESSA };
  return { direcao: DIRECAO_NOTA.SAIDA, tipo: TIPO_NOTA.OUTRA };
}
