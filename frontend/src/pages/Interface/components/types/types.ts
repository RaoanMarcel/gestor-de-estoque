export interface Produto {
  usuario: any;
  id: number;
  codigoItem: string;
  bipadoEm: string;
}

export interface PalletData {
  id: number;
  numero: string;
  rua?: string;
  estrutura?: string;
  nivel?: string;
  tipo: string;
  descricao: string;
  versao: number;
  produtos: Produto[];
}