export interface PalletCount {
  produtos: number;
}

export interface Pallet {
  id: number;
  numero: string;
  rua?: string;
  estrutura?: string;
  nivel?: string;
  _count?: PalletCount;
}

export interface CriarPalletInput {
  numero: string;
  rua: string;
  estrutura: string;
  nivel: string;
}