// backend/src/controllers/maskController.ts
import { prisma } from '../lib/prisma.js';

/**
 * Carrega as máscaras de bipagem predefinidas do tenant atual (cadastradas pela
 * própria tela do Full — ver mascaraAdminController.ts) como um mapa sku -> máscara.
 * Legenda da Máscara:
 * @ = Apenas Letras
 * # = Apenas Números
 * * = Letras ou Números (Alfanumérico)
 * Qualquer outro caractere será exigido exatamente como escrito (Ex: B, R, -, N, A)
 */
export const carregarMascaras = async (): Promise<Record<string, string>> => {
  const registros = await prisma.mascaraSku.findMany();
  return Object.fromEntries(registros.map((r) => [r.sku, r.mascara]));
};
