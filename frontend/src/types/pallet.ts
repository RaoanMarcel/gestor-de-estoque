export interface PalletCount {
  produtos: number;
}

export interface Pallet {
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
  produtos?: any[];
}

export interface CriarPalletInput {
  numero: string;
  rua: string;
  estrutura: string;
  nivel: string;
  tipo: string;
  descricao: string;
}