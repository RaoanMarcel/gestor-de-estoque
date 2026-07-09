import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma: any = new PrismaClient();

// Prefixo e quantidade de dígitos do código sequencial (ex: P-00001)
const PREFIXO_SEQUENCIAL = 'P-';
const DIGITOS_SEQUENCIAL = 5;
const CHAVE_CONTADOR = 'PRODUTO';

// 1. Criar Novo Pallet
export const criarPallet = async (req: Request, res: Response) => {
  try {
    const { numero, rua, estrutura, nivel, tipo } = req.body;

    if (!numero) {
      return res.status(400).json({ error: 'O número do pallet é obrigatório!' });
    }

    const novoPallet = await (prisma as any).pallet.create({
      data: {
        numero,
        rua,
        estrutura,
        nivel,
        tipo: tipo || "PADRAO" 
      }
    });

    return res.status(201).json(novoPallet);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar pallet.' });
  }
};

// 2. Listar Todos os Pallets (Para a tela de visão geral)
export const listarPallets = async (_req: Request, res: Response) => {
  try {
    const pallets = await prisma.pallet.findMany({
      include: { 
        _count: { select: { produtos: true } },
        produtos: { select: { codigoItem: true } } // 🌟 ADICIONADO: Envia as triagens para o GPS do front
      }
    });
    return res.status(200).json(pallets);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar pallets.' });
  }
};

// 3. Buscar um Pallet Específico com a sua listagem lateral atualizada
export const buscarPalletPorId = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const pallet = await prisma.pallet.findUnique({
      where: { id: Number(id) },
      include: { produtos: { orderBy: { bipadoEm: 'desc' } } } // Traz os itens mais recentes no topo
    });
    
    if (!pallet) return res.status(404).json({ error: 'Pallet não encontrado.' });
    return res.status(200).json(pallet);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pallet.' });
  }
};

// 🔢 Gera o próximo código sequencial (ex: P-00001) de forma atômica.
// O incremento do contador e a criação do item acontecem na mesma transação,
// então duas bipagens simultâneas nunca recebem o mesmo número.
const gerarProximoCodigoSequencial = async (tx: any): Promise<string> => {
  const contador = await tx.contador.upsert({
    where: { chave: CHAVE_CONTADOR },
    update: { valor: { increment: 1 } },
    create: { chave: CHAVE_CONTADOR, valor: 1 }
  });

  return `${PREFIXO_SEQUENCIAL}${String(contador.valor).padStart(DIGITOS_SEQUENCIAL, '0')}`;
};

export const biparItem = async (req: Request, res: Response) => {
  // gerarSequencial: quando true, ignora o codigoItem recebido e gera um código
  // sequencial novo no servidor (usado no módulo de retriagem para emitir etiquetas).
  const { palletId, codigoItem, acao, gerarSequencial } = req.body; // acao: 'ENTRADA' ou 'SAIDA'

  try {
    const pallet = await prisma.pallet.findUnique({ where: { id: Number(palletId) } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    // --- MODO ENTRADA DE PRODUTOS ---
      if (acao === 'ENTRADA') {
      // 1. Conta quantos produtos já estão armazenados neste pallet específico
      const totalAtual = await prisma.produtoPallet.count({
        where: { palletId: Number(palletId) }
      });

      // 2. Se já atingiu ou passou o limite de 140, barra a operação
      if (totalAtual >= 140) {
        return res.status(400).json({ 
          error: 'Alerta de Lotação! Este pallet atingiu o limite máximo de 140 volumes.' 
        });
      }

      let item;

      if (gerarSequencial) {
        // Gera o código sequencial e cria o item dentro da mesma transação
        item = await prisma.$transaction(async (tx: any) => {
          const codigoGerado = await gerarProximoCodigoSequencial(tx);
          return tx.produtoPallet.create({
            data: {
              palletId: Number(palletId),
              codigoItem: codigoGerado
            }
          });
        });
      } else {
        // Fluxo normal: item já chega com um código bipado manualmente
        item = await prisma.produtoPallet.create({
          data: { 
            palletId: Number(palletId), 
            codigoItem: String(codigoItem) 
          }
        });
      }

      // ✨ SALVA NO LOG: Registra que a triagem entrou neste pallet
      await prisma.historicoMovimentacao.create({
        data: {
          codigoItem: item.codigoItem,
          acao: 'ENTRADA',
          palletAlvo: pallet.numero || `Pallet #${pallet.id}`
        }
      });

      return res.status(200).json({ mensagem: 'Item adicionado com sucesso!', item });
    } 
    
    // --- MODO EXCLUSÃO / SAÍDA DE PRODUTOS ---
    if (acao === 'SAIDA') {
      const itemExistente = await prisma.produtoPallet.findUnique({
        where: { codigoItem: String(codigoItem) }
      });

      if (!itemExistente || itemExistente.palletId !== Number(palletId)) {
        return res.status(400).json({ error: 'Alerta! Este produto não consta neste pallet.' });
      }

      await prisma.produtoPallet.delete({
        where: { codigoItem: String(codigoItem) }
      });

      // ✨ SALVA NO LOG: Registra que a triagem saiu deste pallet
        await prisma.historicoMovimentacao.create({
      data: {
        codigoItem: String(codigoItem),
        acao: 'SAIDA',
        palletAlvo: pallet.numero || `Pallet #${pallet.id}`
      }
    });

      return res.status(200).json({ mensagem: 'Item removido do pallet com sucesso!' });
    }

    return res.status(400).json({ error: 'Ação inválida. Use ENTRADA ou SAIDA.' });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Alerta de Duplicidade! Esta triagem já foi utilizado!'});
    }
    console.error("Erro no servidor:", error);
    return res.status(500).json({ error: 'Erro operacional ao processar bip.' });
  }
};

// ====================================================================
// 🔄 5. TRANSFERÊNCIA INDIVIDUAL (Mover 1 triagem para outro Pallet)
// ====================================================================
export const transferirUm = async (req: Request, res: Response) => {
  try {
    const { codigoItem, numeroPalletDestino } = req.body;

    if (!codigoItem || !numeroPalletDestino) {
      return res.status(400).json({ error: 'Código do item e pallet de destino são obrigatórios.' });
    }

    // 1. Encontra o pallet de destino pelo número (Ex: "56" ou "Defeito")
    const palletDestino = await (prisma as any).pallet.findUnique({
      where: { numero: String(numeroPalletDestino) },
      include: { produtos: true }
    });

    if (!palletDestino) {
      return res.status(404).json({ error: `Pallet de destino "${numeroPalletDestino}" não foi localizado.` });
    }

    // 2. Validação rígida da capacidade máxima de 140 volumes
    if (palletDestino.produtos.length >= 140) {
      return res.status(400).json({ 
        error: `Alerta de Lotação! O pallet destino "${numeroPalletDestino}" já atingiu o limite de 140 volumes.` 
      });
    }

    // 3. Atualiza o endereço da triagem mudando o palletId no banco local
    const produtoAtualizado = await (prisma as any).produtoPallet.update({
      where: { codigoItem: String(codigoItem) },
      data: { palletId: palletDestino.id }
    });

    // 4. 📝 GRAVA NO HISTÓRICO: Registra o log da transferência para auditoria
    await (prisma as any).historicoMovimentacao.create({
      data: {
        codigoItem: String(codigoItem),
        acao: 'TRANSFERENCIA',
        palletAlvo: String(numeroPalletDestino)
      }
    });

    return res.status(200).json({ 
      mensagem: 'Produto transferido com sucesso!', 
      item: produtoAtualizado 
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao processar a transferência individual.' });
  }
};


export const transferirEmLote = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletDestino } = req.body; // Recebe Array ['381731', '34879131'...]

    if (!codigosItens || !Array.isArray(codigosItens) || codigosItens.length === 0) {
      return res.status(400).json({ error: 'Nenhum item selecionado para transferência.' });
    }

    if (!numeroPalletDestino) {
      return res.status(400).json({ error: 'Pallet de destino não informado.' });
    }

    // 1. Localiza o pallet alvo pelo identificador alfa-numérico
    const palletDestino = await (prisma as any).pallet.findUnique({
      where: { numero: String(numeroPalletDestino) },
      include: { produtos: true }
    });

    if (!palletDestino) {
      return res.status(404).json({ error: `Pallet de destino "${numeroPalletDestino}" não encontrado.` });
    }

    // 2. Valida se o lote selecionado cabe no espaço restante antes de estourar os 140
    const espacoDisponivel = 140 - palletDestino.produtos.length;
    if (codigosItens.length > espacoDisponivel) {
      return res.status(400).json({ 
        error: `Espaço insuficiente no pallet "${numeroPalletDestino}". Vagas restantes: ${espacoDisponivel}. Você tentou transferir: ${codigosItens.length} itens.` 
      });
    }

    // 3. Executa a atualização massiva de endereço no banco (.updateMany)
    await (prisma as any).produtoPallet.updateMany({
      where: {
        codigoItem: { in: codigosItens }
      },
      data: {
        palletId: palletDestino.id
      }
    });

  
    const logsData = codigosItens.map((codigo: string) => ({
      codigoItem: String(codigo),
      acao: 'TRANSFERENCIA_LOTE',
      palletAlvo: String(numeroPalletDestino)
    }));

    await (prisma as any).historicoMovimentacao.createMany({
      data: logsData
    });

    return res.status(200).json({ 
      mensagem: `${codigosItens.length} produtos transferidos para o pallet "${numeroPalletDestino}" com sucesso!` 
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao processar a transferência em lote.' });
  }
};

// ====================================================================
// 🚀 7. LANÇAR AO RMA (Exclusivo para Pallets do Tipo DEFEITO)
// ====================================================================
export const enviarParaRMA = async (req: Request, res: Response) => {
  try {
    const { codigosItens, numeroPalletOrigem } = req.body;

    if (!codigosItens || !Array.isArray(codigosItens) || codigosItens.length === 0) {
      return res.status(400).json({ error: 'Nenhum item selecionado para o RMA.' });
    }

    // 1. Remove em lote os produtos do pallet físico no banco local (.deleteMany)
    // Isso esvazia o pallet físico imediatamente na tela
    await (prisma as any).produtoPallet.deleteMany({
      where: {
        codigoItem: { in: codigosItens }
      }
    });

    // 2. 📝 GRAVA NO HISTÓRICO COMO RMA: Alimenta a tabela de auditoria para o Relatório Fantasma
    const logsRMA = codigosItens.map((codigo: string) => ({
      codigoItem: String(codigo),
      acao: 'ENVIADO_RMA', // Marcador crucial para o relatório
      palletAlvo: String(numeroPalletOrigem) // Registra de qual pallet de defeito ele saiu
    }));

    await (prisma as any).historicoMovimentacao.createMany({
      data: logsRMA
    });

    return res.status(200).json({
      mensagem: `Sucesso! ${codigosItens.length} volumes foram despachados para o sistema de RMA e removidos do pallet físico.`
    });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao processar envio para o RMA.' });
  }
};


export const excluirPallet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Busca o pallet incluindo a contagem de produtos associados
    const palletAlvo = await (prisma as any).pallet.findUnique({
      where: { id: Number(id) },
      include: { produtos: true }
    });

    if (!palletAlvo) {
      return res.status(404).json({ error: 'Pallet não localizado no sistema.' });
    }

    // 2. Trava de Segurança: impede a exclusão se houver itens guardados nele
    if (palletAlvo.produtos && palletAlvo.produtos.length > 0) {
      return res.status(400).json({ 
        error: `Bloqueio de Segurança! O pallet "${palletAlvo.numero}" possui ${palletAlvo.produtos.length} produtos armazenados. Esvazie-o antes de excluir.` 
      });
    }

    // 3. Executa a exclusão definitiva do registro do endereço no banco local
    await (prisma as any).pallet.delete({
      where: { id: Number(id) }
    });

    // 4. Opcional: Registra opcionalmente no histórico geral para auditoria futura
    await (prisma as any).historicoMovimentacao.create({
      data: {
        codigoItem: 'SISTEMA',
        acao: 'EXCLUSAO_PALLET',
        palletAlvo: String(palletAlvo.numero)
      }
    });

    return res.status(200).json({ mensagem: `O pallet "${palletAlvo.numero}" foi removido da malha com sucesso.` });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao tentar excluir a posição do mapa.' });
  }
};