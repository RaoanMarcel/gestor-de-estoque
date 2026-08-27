export interface Produto {
  id: number;
  codigoItem: string;
  palletId: number;
  bipadoEm: string;
  usuarioId?: number | null;
  usuario?: {
    username: string;
  };
}

export interface PalletCount {
  produtos: number;
}

export interface PalletData {
  descricao: string;
  id: number;
  numero: string;
  rua?: string;
  estrutura?: string;
  nivel?: string;
  tipo: string; 
  _count?: {
    produtos: number;
  };
  produtos: Produto[];
}