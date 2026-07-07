import api from "../../../services/api";
import type {
  Pallet,
  CreatePalletDTO,
  UpdatePalletDTO,
} from "../types/pallet";

class PalletService {
  private map(data: any): Pallet {
    return {
      id: data.id,
      code: data.numero,
      street: data.rua,
      structure: data.estrutura,
      level: data.nivel,
      products: data._count?.produtos ?? 0,
    };
  }

  async list(): Promise<Pallet[]> {
    const response = await api.get("/pallets");

    return response.data.map((item: any) => this.map(item));
  }

  async create(data: CreatePalletDTO): Promise<void> {
    await api.post("/pallets", {
      numero: data.code,
      rua: data.street,
      estrutura: data.structure,
      nivel: data.level,
    });
  }

  async update(id: number, data: UpdatePalletDTO): Promise<void> {
    await api.put(`/pallets/${id}`, {
      numero: data.code,
      rua: data.street,
      estrutura: data.structure,
      nivel: data.level,
    });
  }

  async remove(id: number): Promise<void> {
    await api.delete(`/pallets/${id}`);
  }
}

export default new PalletService();