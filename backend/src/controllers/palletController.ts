import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getAuth, requireTenantId } from '../lib/auth.js';
import { SocketService } from '../services/SocketService.js';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';

const getSocketId = (req: Request): string | undefined => {
  return req.headers['x-socket-id'] as string | undefined;
};

const getRegrasPallet = (pallet: any) => {
  const tipo = pallet?.tipo?.toUpperCase() || '';
  const desc = pallet?.descricao?.toUpperCase() || '';
  const num = pallet?.numero?.toUpperCase() || '';
  const textoBusca = `${tipo} ${desc} ${num}`;

  if (textoBusca.includes('RETORNO') || num.startsWith('R-')) {
    return { prefixo: 'R-', chaveBanco: 'PRODUTO_RETORNO', digitos: 5, isTransformacao: true };
  } else if (textoBusca.includes('NOVO') || num.startsWith('N-')) {
    return { prefixo: 'N-', chaveBanco: 'PRODUTO_NOVO', digitos: 5, isTransformacao: true };
  } else if (textoBusca.includes('DEVOLUCAO') || num.startsWith('CR-')) {
    return { prefixo: 'CR-', chaveBanco: 'PRODUTO_CR', digitos: 5, isTransformacao: true };
  } else if (textoBusca.includes('RETRIAGEM')) {
    return { prefixo: '000', chaveBanco: 'PRODUTO_TRIAGEM', digitos: 5, isTransformacao: true };
  }

  return { prefixo: '000', chaveBanco: 'PRODUTO_TRIAGEM', digitos: 5, isTransformacao: true };
};

const gerarProximoCodigoSequencial = async (tx: any, regras: any, tenantId: number): Promise<string> => {
  const contador = await tx.contador.upsert({
    where: { tenantId_chave: { tenantId, chave: regras.chaveBanco } },
    update: { valor: { increment: 1 } },
    create: { tenantId, chave: regras.chaveBanco, valor: 1 },
  });
  return `${regras.prefixo}${String(contador.valor).padStart(regras.digitos, '0')}`;
};

export const biparItem = async (req: Request, res: Response): Promise<Response | void> => {
  const { palletId, codigoItem, acao, gerarSequencial, novoCodigoBipado } = req.body;
  const numeroPallet = String(palletId);
  const auth = getAuth(req);
  const usuarioLogadoId = auth?.id;
  const usernameLogado = auth?.username || 'Sistema';
  const tid = requireTenantId(req);

  try {
    const pallet = await prisma.pallet.findFirst({ where: { numero: numeroPallet } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    const idInterno = pallet.id;
    const regras = getRegrasPallet(pallet);

    if (acao === 'ENTRADA') {
      const totalAtual = await prisma.produtoPallet.count({ where: { palletId: idInterno } });
      if (totalAtual >= 140) return res.status(400).json({ error: 'Alerta de Lotação!' });

      if (gerarSequencial) {
        const itemGerado = await prisma.$transaction(async (tx) => {
          const codigoFinal = await gerarProximoCodigoSequencial(tx, regras, tid);
          return tx.produtoPallet.create({
            data: { palletId: idInterno, codigoItem: codigoFinal, usuarioId: usuarioLogadoId, tenantId: tid },
          });
        });

        await prisma.historicoMovimentacao.create({
          data: {
            codigoItem: itemGerado.codigoItem,
            acao: 'ENTRADA',
            palletAlvo: pallet.numero,
            palletDestino: pallet.numero,
            usuarioId: usuarioLogadoId,
          } as any,
        });

        const socketId = getSocketId(req);
        SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, socketId);
        SocketService.getInstance().emitToPallet(tid, numeroPallet, 'pallet:updated', { acao: 'ENTRADA', item: { ...itemGerado, usuario: { username: usernameLogado } } }, socketId);

        return res.status(200).json({ mensagem: 'Item gerado com sucesso!', item: { ...itemGerado, usuario: { username: usernameLogado } } });
      }

      const codigoFormatado = String(codigoItem).trim().toUpperCase();

      const itemExistente = await prisma.produtoPallet.findFirst({
        where: { codigoItem: codigoFormatado },
        include: { pallet: true },
      });

      const precisaTransformar = regras.isTransformacao && regras.prefixo !== '' && !codigoFormatado.startsWith(regras.prefixo);

      if (precisaTransformar) {
        if (!novoCodigoBipado) {
          return res.status(200).json({
            requerNovaBipagem: true,
            codigoOriginal: codigoFormatado,
            prefixoEsperado: regras.prefixo,
          });
        }

        const codigoFinalBipado = String(novoCodigoBipado).trim().toUpperCase();

        if (!codigoFinalBipado.startsWith(regras.prefixo)) {
          return res.status(400).json({ error: `Ops! A nova etiqueta colada DEVE iniciar com ${regras.prefixo}` });
        }

        const checkNovoExiste = await prisma.produtoPallet.findFirst({ where: { codigoItem: codigoFinalBipado } });
        if (checkNovoExiste) {
          return res.status(400).json({ error: `A etiqueta ${codigoFinalBipado} já está vinculada a outro produto na malha!` });
        }

        if (itemExistente) {
          const novoItem = await prisma.$transaction(async (tx) => {
            await tx.produtoPallet.delete({ where: { id: itemExistente.id } });
            const criado = await tx.produtoPallet.create({ data: { palletId: idInterno, codigoItem: codigoFinalBipado, usuarioId: usuarioLogadoId, tenantId: tid } });

            await tx.historicoMovimentacao.create({
              data: {
                codigoItem: codigoFinalBipado,
                codigoAnterior: itemExistente.codigoItem,
                acao: 'RETRIAGEM_CONFIRMADA',
                palletOrigem: itemExistente.pallet.numero,
                palletDestino: pallet.numero,
                palletAlvo: pallet.numero,
                usuarioId: usuarioLogadoId,
              } as any,
            });
            return criado;
          });

          const socketId = getSocketId(req);
          SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'TRANSFERENCIA_RETRIAGEM' }, socketId);
          SocketService.getInstance().emitToPallet(tid, itemExistente.pallet.numero, 'pallet:updated', { acao: 'SAIDA', codigoItem: itemExistente.codigoItem }, socketId);
          SocketService.getInstance().emitToPallet(tid, numeroPallet, 'pallet:updated', { acao: 'ENTRADA', item: { ...novoItem, usuario: { username: usernameLogado } } }, socketId);

          return res.status(200).json({ mensagem: `Código substituído com sucesso!`, item: { ...novoItem, usuario: { username: usernameLogado } } });
        } else {
          const novoItem = await prisma.$transaction(async (tx) => {
            const criado = await tx.produtoPallet.create({ data: { palletId: idInterno, codigoItem: codigoFinalBipado, usuarioId: usuarioLogadoId, tenantId: tid } });

            await tx.historicoMovimentacao.create({
              data: {
                codigoItem: codigoFinalBipado,
                codigoAnterior: codigoFormatado,
                acao: 'ENTRADA_COM_RETRIAGEM',
                palletDestino: pallet.numero,
                palletAlvo: pallet.numero,
                usuarioId: usuarioLogadoId,
              } as any,
            });
            return criado;
          });

          const socketId = getSocketId(req);
          SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, socketId);
          SocketService.getInstance().emitToPallet(tid, numeroPallet, 'pallet:updated', { acao: 'ENTRADA', item: { ...novoItem, usuario: { username: usernameLogado } } }, socketId);

          return res.status(200).json({ mensagem: `Item inédito adicionado sob a nova etiqueta!`, item: { ...novoItem, usuario: { username: usernameLogado } } });
        }
      }

      if (itemExistente) {
        const atualizado = await prisma.produtoPallet.update({ where: { id: itemExistente.id }, data: { palletId: idInterno, usuarioId: usuarioLogadoId } });

        await prisma.historicoMovimentacao.create({
          data: {
            codigoItem: atualizado.codigoItem,
            acao: 'TRANSFERENCIA',
            palletOrigem: itemExistente.pallet.numero,
            palletDestino: pallet.numero,
            palletAlvo: pallet.numero,
            usuarioId: usuarioLogadoId,
          } as any,
        });

        const socketId = getSocketId(req);
        SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'TRANSFERENCIA' }, socketId);
        SocketService.getInstance().emitToPallet(tid, itemExistente.pallet.numero, 'pallet:updated', { acao: 'SAIDA', codigoItem: itemExistente.codigoItem }, socketId);
        SocketService.getInstance().emitToPallet(tid, numeroPallet, 'pallet:updated', { acao: 'ENTRADA', item: { ...atualizado, usuario: { username: usernameLogado } } }, socketId);

        return res.status(200).json({ mensagem: 'Item transferido com sucesso!', item: { ...atualizado, usuario: { username: usernameLogado } } });
      }

      const item = await prisma.$transaction(async (tx) => {
        return tx.produtoPallet.create({
          data: { palletId: idInterno, codigoItem: codigoFormatado, usuarioId: usuarioLogadoId, tenantId: tid },
        });
      });

      await prisma.historicoMovimentacao.create({
        data: {
          codigoItem: codigoFormatado,
          acao: 'ENTRADA',
          palletAlvo: pallet.numero,
          palletDestino: pallet.numero,
          usuarioId: usuarioLogadoId,
        } as any,
      });

      const socketId = getSocketId(req);
      SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, socketId);
      SocketService.getInstance().emitToPallet(tid, numeroPallet, 'pallet:updated', { acao: 'ENTRADA', item: { ...item, usuario: { username: usernameLogado } } }, socketId);

      return res.status(200).json({ mensagem: 'Item adicionado com sucesso!', item: { ...item, usuario: { username: usernameLogado } } });
    }

    if (acao === 'SAIDA') {
      const itemExistente = await prisma.produtoPallet.findFirst({ where: { codigoItem: String(codigoItem) } });
      if (!itemExistente || itemExistente.palletId !== idInterno) {
        return res.status(400).json({ error: 'Alerta! Este produto não consta neste pallet.' });
      }

      await prisma.produtoPallet.deleteMany({ where: { codigoItem: String(codigoItem) } });

      await prisma.historicoMovimentacao.create({
        data: {
          codigoItem: String(codigoItem),
          acao: 'SAIDA',
          palletAlvo: pallet.numero,
          palletOrigem: pallet.numero,
          usuarioId: usuarioLogadoId,
        } as any,
      });

      const socketId = getSocketId(req);
      SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, socketId);
      SocketService.getInstance().emitToPallet(tid, numeroPallet, 'pallet:updated', { acao: 'SAIDA', codigoItem }, socketId);

      return res.status(200).json({ mensagem: 'Item removido do pallet com sucesso!' });
    }

    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Alerta de Duplicidade! Este código de item já existe na malha.' });
    }
    return res.status(500).json({ error: 'Erro operacional ao processar bip.' });
  }
};

export const transferirUm = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { codigoItem, numeroPalletDestino } = req.body;
    const auth = getAuth(req);
    const usuarioLogadoId = auth?.id;
    const usernameLogado = auth?.username || 'Sistema';
    const tid = requireTenantId(req);

    if (!codigoItem || !numeroPalletDestino) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
    }

    const produtoOrigem = await prisma.produtoPallet.findFirst({
      where: { codigoItem: String(codigoItem) },
      include: { pallet: true },
    });
    if (!produtoOrigem) {
      return res.status(404).json({ error: 'Produto de origem não encontrado na malha.' });
    }

    const palletDestino = await prisma.pallet.findFirst({
      where: { numero: String(numeroPalletDestino) },
      include: { produtos: true },
    });
    if (!palletDestino) {
      return res.status(404).json({ error: `Pallet destino não localizado.` });
    }
    if (palletDestino.produtos.length >= 140) {
      return res.status(400).json({ error: `Alerta de Lotação no destino.` });
    }

    const regras = getRegrasPallet(palletDestino);
    const precisaTransformar = regras.isTransformacao && regras.prefixo !== '' && !produtoOrigem.codigoItem.startsWith(regras.prefixo);

    if (precisaTransformar) {
      return res.status(200).json({
        requerNovaBipagem: true,
        codigoOriginal: produtoOrigem.codigoItem,
        prefixoEsperado: regras.prefixo,
      });
    }

    const itemFinal = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.produtoPallet.update({
        where: { id: produtoOrigem.id },
        data: { palletId: palletDestino.id, usuarioId: usuarioLogadoId },
      });

      await tx.historicoMovimentacao.create({
        data: {
          codigoItem: produtoOrigem.codigoItem,
          acao: 'TRANSFERENCIA',
          palletOrigem: produtoOrigem.pallet.numero,
          palletDestino: palletDestino.numero,
          palletAlvo: palletDestino.numero,
          usuarioId: usuarioLogadoId,
        } as any,
      });

      return atualizado;
    });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'TRANSFERENCIA' }, socketId);
    SocketService.getInstance().emitToPallet(tid, produtoOrigem.pallet.numero, 'pallet:updated', { acao: 'SAIDA', codigoItem: produtoOrigem.codigoItem }, socketId);
    SocketService.getInstance().emitToPallet(tid, palletDestino.numero, 'pallet:updated', { acao: 'ENTRADA', item: { ...itemFinal, usuario: { username: usernameLogado } } }, socketId);

    return res.status(200).json({ mensagem: `Item ${codigoItem} puxado com sucesso!`, item: { ...itemFinal, usuario: { username: usernameLogado } } });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao processar a transferência unitária.' });
  }
};

export const transferirEmLote = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { codigosItens, numeroPalletDestino } = req.body;
    const auth = getAuth(req);
    const usuarioLogadoId = auth?.id;
    const tid = requireTenantId(req);

    if (!codigosItens || codigosItens.length === 0 || !numeroPalletDestino) {
      return res.status(400).json({ error: 'Dados ausentes.' });
    }

    const primeiroItem = await prisma.produtoPallet.findFirst({ where: { codigoItem: String(codigosItens[0]) }, include: { pallet: true } });
    if (!primeiroItem) return res.status(404).json({ error: 'Itens não encontrados' });

    const palletDestino = await prisma.pallet.findFirst({ where: { numero: String(numeroPalletDestino) }, include: { produtos: true } });
    if (!palletDestino) return res.status(404).json({ error: `Pallet destino não encontrado.` });
    if (codigosItens.length > (140 - palletDestino.produtos.length)) {
      return res.status(400).json({ error: `Espaço insuficiente no destino.` });
    }

    const regras = getRegrasPallet(palletDestino);
    const itensOriginais = await prisma.produtoPallet.findMany({ where: { codigoItem: { in: codigosItens } } });
    const temTransformacaoPendente = itensOriginais.some((item) => regras.isTransformacao && regras.prefixo !== '' && !item.codigoItem.startsWith(regras.prefixo));

    if (temTransformacaoPendente) {
      return res.status(400).json({ error: `Atenção: A Transferência em Lote foi bloqueada porque o Pallet de destino exige a troca das etiquetas físicas por etiquetas que iniciem com (${regras.prefixo}). Acesse a tela do pallet de destino e faça as transferências bipando item a item com suas novas etiquetas.` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.produtoPallet.updateMany({
        where: { codigoItem: { in: codigosItens } },
        data: { palletId: palletDestino.id, usuarioId: usuarioLogadoId },
      });
      const logsData = codigosItens.map((codigo: string) => ({
        codigoItem: String(codigo),
        acao: 'TRANSFERENCIA_LOTE',
        palletAlvo: palletDestino.numero,
        palletOrigem: primeiroItem.pallet.numero,
        palletDestino: palletDestino.numero,
        usuarioId: usuarioLogadoId,
      }));
      await tx.historicoMovimentacao.createMany({ data: logsData as any });
    });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'TRANSFERENCIA_LOTE' }, socketId);
    SocketService.getInstance().emitToPallet(tid, primeiroItem.pallet.numero, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens: codigosItens }, socketId);
    SocketService.getInstance().emitToPallet(tid, palletDestino.numero, 'pallet:refresh', {}, socketId);

    return res.status(200).json({ mensagem: 'Lote transferido com sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao transferir em lote.' });
  }
};

export const enviarParaRMA = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { codigosItens, numeroPalletOrigem } = req.body;
    const auth = getAuth(req);
    const tid = requireTenantId(req);
    if (!codigosItens || codigosItens.length === 0) return res.status(400).json({ error: 'Nenhum item selecionado.' });

    const primeiroItem = await prisma.produtoPallet.findFirst({ where: { codigoItem: String(codigosItens[0]) }, include: { pallet: true } });
    if (!primeiroItem) return res.status(400).json({ error: 'Erro ao localizar itens.' });

    await prisma.produtoPallet.deleteMany({ where: { codigoItem: { in: codigosItens } } });

    const logsRMA = codigosItens.map((codigo: string) => ({
      codigoItem: String(codigo),
      acao: 'ENVIADO_RMA',
      palletAlvo: String(numeroPalletOrigem),
      palletOrigem: String(numeroPalletOrigem),
      usuarioId: auth?.id,
    }));
    await prisma.historicoMovimentacao.createMany({ data: logsRMA as any });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'ATUALIZADO', palletId: primeiroItem.palletId }, socketId);
    SocketService.getInstance().emitToPallet(tid, primeiroItem.pallet.numero, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);

    return res.status(200).json({ mensagem: `Enviado para RMA com sucesso.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao processar envio para o RMA.' });
  }
};

export const excluirPallet = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { identificador } = req.params;
    const auth = getAuth(req);
    const tid = requireTenantId(req);
    const isNumeric = !isNaN(Number(identificador));

    const palletNoBanco = await prisma.pallet.findFirst({
      where: {
        OR: [
          { numero: String(identificador) },
          ...(isNumeric ? [{ id: Number(identificador) }] : []),
        ],
      },
      include: { produtos: true },
    });

    if (!palletNoBanco) return res.status(404).json({ error: 'Pallet não localizado.' });
    if (palletNoBanco.produtos.length > 0) return res.status(400).json({ error: `Esvazie o pallet antes de excluir.` });

    await prisma.pallet.delete({ where: { id: palletNoBanco.id } });

    await prisma.historicoMovimentacao.create({
      data: {
        codigoItem: 'SISTEMA',
        acao: 'EXCLUSAO_PALLET',
        palletAlvo: String(palletNoBanco.numero),
        palletOrigem: String(palletNoBanco.numero),
        usuarioId: auth?.id,
      } as any,
    });

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'EXCLUIDO', palletId: palletNoBanco.id }, socketId);
    SocketService.getInstance().emitToPallet(tid, palletNoBanco.numero, 'pallet:deleted', { palletId: palletNoBanco.id });

    return res.status(200).json({ mensagem: `Pallet removido com sucesso.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao tentar excluir a posição.' });
  }
};

export const criarPallet = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { numero, rua, estrutura, nivel, tipo, descricao } = req.body;
    const tid = requireTenantId(req);
    if (!numero) return res.status(400).json({ error: 'O número do pallet é obrigatório!' });

    const novoPallet = await prisma.pallet.create({
      data: { numero, rua, estrutura, nivel, descricao, tipo: tipo || 'PADRAO', tenantId: tid },
    });

    SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'CRIADO', pallet: novoPallet }, getSocketId(req));
    return res.status(201).json(novoPallet);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar pallet.' });
  }
};

export const listarPallets = async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const pallets = await prisma.pallet.findMany({
      include: { _count: { select: { produtos: true } }, produtos: { select: { codigoItem: true } } },
    });
    return res.status(200).json(pallets);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar pallets.' });
  }
};

export const buscarPalletPorIdentificador = async (req: Request, res: Response): Promise<Response | void> => {
  const { identificador } = req.params;
  try {
    const pallet = await prisma.pallet.findFirst({
      where: { numero: String(identificador) },
      include: {
        produtos: {
          orderBy: { bipadoEm: 'desc' },
          include: {
            usuario: { select: { username: true } },
          },
        },
      },
    });

    if (!pallet) return res.status(404).json({ error: 'Pallet não encontrado.' });
    return res.status(200).json(pallet);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pallet.' });
  }
};

export const biparItemEmLote = async (req: Request, res: Response): Promise<Response | void> => {
  const { palletId, codigosItens, acao } = req.body;
  const numeroPallet = String(palletId);
  const auth = getAuth(req);
  const tid = requireTenantId(req);

  if (!codigosItens || codigosItens.length === 0) return res.status(400).json({ error: 'Nenhum item enviado.' });

  try {
    const pallet = await prisma.pallet.findFirst({ where: { numero: numeroPallet } });
    if (!pallet) return res.status(404).json({ error: 'Pallet inexistente.' });

    const idInterno = pallet.id;

    if (acao === 'SAIDA') {
      await prisma.produtoPallet.deleteMany({ where: { palletId: idInterno, codigoItem: { in: codigosItens.map(String) } } });

      const logsData = codigosItens.map((codigo: string) => ({
        codigoItem: String(codigo),
        acao: 'SAIDA',
        palletAlvo: pallet.numero,
        palletOrigem: pallet.numero,
        usuarioId: auth?.id,
      }));
      await prisma.historicoMovimentacao.createMany({ data: logsData as any });

      const socketId = getSocketId(req);
      SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'ATUALIZADO', palletId: idInterno }, socketId);
      SocketService.getInstance().emitToPallet(tid, numeroPallet, 'pallet:updated', { acao: 'SAIDA_LOTE', codigosItens }, socketId);

      return res.status(200).json({ mensagem: `${codigosItens.length} itens removidos com sucesso!` });
    }
    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar lote.' });
  }
};

export const lancarPalletNovo = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { palletId, senha } = req.body;
    const auth = getAuth(req);
    const usuarioId = auth?.id;
    const tid = requireTenantId(req);

    if (!palletId || !senha) {
      return res.status(400).json({ error: 'Identificador do pallet e senha do operador são obrigatórios.' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      return res.status(404).json({ error: 'Sessão de usuário inválida.' });
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha incorreta! Operação de lançamento bloqueada.' });
    }

    const pallet = await prisma.pallet.findFirst({
      where: { id: Number(palletId) },
      include: { produtos: true },
    });

    if (!pallet) return res.status(404).json({ error: 'Pallet não encontrado.' });
    if (pallet.produtos.length === 0) return res.status(400).json({ error: 'O pallet não possui produtos para serem lançados.' });
    if (pallet.tipo !== 'NOVO') return res.status(400).json({ error: 'Esta ação só é permitida em Pallets do tipo NOVO.' });

    const codigosLançados = pallet.produtos.map((p) => p.codigoItem);

    await prisma.$transaction(async (tx) => {
      await tx.produtoPallet.deleteMany({ where: { palletId: pallet.id } });

      const logsData = codigosLançados.map((codigo) => ({
        codigoItem: String(codigo),
        acao: 'LANCAMENTO_LOTE_NOVO',
        palletAlvo: pallet.numero,
        palletOrigem: pallet.numero,
        usuarioId: usuarioId,
      }));
      await tx.historicoMovimentacao.createMany({ data: logsData as any });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Relatório - ${pallet.numero}`);

    worksheet.columns = [
      { header: 'Código de Triagem', key: 'codigo', width: 25 },
      { header: 'Posição (Pallet)', key: 'pallet', width: 20 },
      { header: 'Operador Responsável', key: 'operador', width: 30 },
      { header: 'Data do Lançamento', key: 'data', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

    const dataHoraBrasil = new Date().toLocaleString('pt-BR');

    codigosLançados.forEach((codigo) => {
      worksheet.addRow({
        codigo: codigo,
        pallet: pallet.numero,
        operador: usuario.username.toUpperCase(),
        data: dataHoraBrasil,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Fechamento_${pallet.numero}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

    const socketId = getSocketId(req);
    SocketService.getInstance().emitToGlobal(tid, 'grid:updated', { acao: 'ATUALIZADO', palletId: pallet.id }, socketId);
    SocketService.getInstance().emitToPallet(tid, pallet.numero, 'pallet:refresh', {}, socketId);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno no servidor ao processar lançamento de lote.' });
  }
};
