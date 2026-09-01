// backend/src/services/nfeParser.ts
import { XMLParser } from 'fast-xml-parser';

/**
 * Leitor de XML de NF-e (modelo 55).
 * Aceita o XML com o invólucro de processamento (<nfeProc>) ou começando direto em <NFe>.
 * Retorna o cabeçalho da nota e a lista de itens com TODOS os campos relevantes
 * para conferência e futura entrada em estoque.
 */

// parseTagValue/parseAttributeValue ficam DESLIGADOS de propósito: a chave de acesso (44 díg),
// EAN, CNPJ e NCM são numéricos porém longos e perderiam precisão se virassem Number.
// A conversão numérica dos campos que realmente são valores é feita manualmente (toNumber).
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

const asArray = <T>(valor: T | T[] | undefined | null): T[] => {
  if (valor === undefined || valor === null) return [];
  return Array.isArray(valor) ? valor : [valor];
};

const toNumber = (valor: any): number | null => {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const toStr = (valor: any): string | null => {
  if (valor === undefined || valor === null) return null;
  const s = String(valor).trim();
  return s === '' ? null : s;
};

const toDate = (valor: any): Date | null => {
  const s = toStr(valor);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export interface RecebimentoCabecalho {
  numeroNota: string | null;
  serieNota: string | null;
  chaveAcesso: string | null;
  fornecedor: string | null;
  fornecedorCnpj: string | null;
  valorTotal: number | null;
  dataEmissao: Date | null;
}

export interface RecebimentoItemParsed {
  numItem: number;
  codigoProduto: string;
  ean: string | null;
  eanTributavel: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number | null;
  valorTotal: number | null;
}

export interface NfeParseResult {
  cabecalho: RecebimentoCabecalho;
  itens: RecebimentoItemParsed[];
}

export function parseNfeXml(xml: string): NfeParseResult {
  let raiz: any;
  try {
    raiz = parser.parse(xml);
  } catch {
    throw new Error('Não foi possível ler o arquivo XML.');
  }

  const nfeProc = raiz?.nfeProc || raiz;
  const nfe = nfeProc?.NFe || nfeProc?.nfe || raiz?.NFe;
  const infNFe = nfe?.infNFe;

  if (!infNFe) {
    throw new Error('O arquivo enviado não é um XML de NF-e válido.');
  }

  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const total = infNFe.total?.ICMSTot || {};
  const prot = nfeProc?.protNFe?.infProt || {};

  let chaveAcesso = toStr(prot.chNFe);
  if (!chaveAcesso) {
    const id = toStr(infNFe['@_Id']);
    if (id) chaveAcesso = id.replace(/^NFe/i, '');
  }

  const cabecalho: RecebimentoCabecalho = {
    numeroNota: toStr(ide.nNF),
    serieNota: toStr(ide.serie),
    chaveAcesso,
    fornecedor: toStr(emit.xNome),
    fornecedorCnpj: toStr(emit.CNPJ) || toStr(emit.CPF),
    valorTotal: toNumber(total.vNF),
    dataEmissao: toDate(ide.dhEmi) || toDate(ide.dEmi),
  };

  const itens: RecebimentoItemParsed[] = asArray<any>(infNFe.det).map((det: any, index: number) => {
    const prod = det?.prod || {};
    const ean = toStr(prod.cEAN);
    const eanTrib = toStr(prod.cEANTrib);
    const invalido = (v: string | null) => !v || v.toUpperCase() === 'SEM GTIN';

    return {
      numItem: toNumber(det?.['@_nItem']) ?? index + 1,
      codigoProduto: toStr(prod.cProd) || `ITEM-${index + 1}`,
      ean: invalido(ean) ? null : ean,
      eanTributavel: invalido(eanTrib) ? null : eanTrib,
      descricao: toStr(prod.xProd) || 'Produto sem descrição',
      ncm: toStr(prod.NCM),
      cfop: toStr(prod.CFOP),
      unidade: toStr(prod.uCom) || toStr(prod.uTrib),
      quantidade: toNumber(prod.qCom) ?? toNumber(prod.qTrib) ?? 0,
      valorUnitario: toNumber(prod.vUnCom) ?? toNumber(prod.vUnTrib),
      valorTotal: toNumber(prod.vProd),
    };
  });

  if (itens.length === 0) {
    throw new Error('Nenhum produto encontrado no XML da NF-e.');
  }

  return { cabecalho, itens };
}
