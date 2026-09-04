// backend/src/controllers/maskController.ts

/**
 * Retorna a máscara predefinida para um SKU específico.
 * Legenda da Máscara:
 * @ = Apenas Letras
 * # = Apenas Números
 * * = Letras ou Números (Alfanumérico)
 * Qualquer outro caractere será exigido exatamente como escrito (Ex: B, R, -, N, A)
 */
export const getMascaraPorSku = (sku: string): string | null => {
  const regras: Record<string, string> = {
    '012400': '**********', 
    '012249': 'BR********',
    '003427': 'NAH*****************', 
    '013684': '########',
    '012535': '**********',
    '013227': '********',
    '013691': '********',
  };

  return regras[sku] || null;
};