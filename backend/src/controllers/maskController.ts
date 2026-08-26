// backend/src/controllers/maskController.ts

/**
 * Retorna a máscara predefinida para um SKU específico.
 * Legenda da Máscara:
 * L = Apenas Letras
 * N = Apenas Números
 * X = Letras ou Números (Alfanumérico)
 * Qualquer outro caractere será exigido exatamente como escrito (Ex: B, R, -)
 */
export const getMascaraPorSku = (sku: string): string | null => {
  const regras: Record<string, string> = {
    // 10 caracteres sendo letra ou numero
    '012400': 'XXXXXXXXXX', 
    
    // Inicia com BR e tem um total de 10 caracteres (BR + 8 alfanuméricos)
    '012249': 'BRXXXXXXXX', 
  };

  return regras[sku] || null;
};