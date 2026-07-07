export interface Pallet {
  id: number;
  code: string;
  street?: string;
  structure?: string;
  level?: string;
  products: number;
}

export interface CreatePalletDTO {
  code: string;
  street?: string;
  structure?: string;
  level?: string;
}

export interface UpdatePalletDTO {
  code?: string;
  street?: string;
  structure?: string;
  level?: string;
}