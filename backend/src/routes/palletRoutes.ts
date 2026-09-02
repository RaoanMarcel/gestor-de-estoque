import { Router } from 'express';
import {
  criarPallet, buscarPalletPorIdentificador, listarPallets, biparItem,
  transferirUm, transferirEmLote, enviarParaRMA, excluirPallet, biparItemEmLote, lancarPalletNovo
} from '../controllers/palletController.js';

import { exportarHistoricoExcel, exportarRelatorioRMA, exportarRelatorioGeralItens } from '../controllers/excelController.js';

import { buscarHistoricoItem } from '../controllers/historicoController.js';
import { autenticarToken, somenteTenant } from '../middlewares/authMiddleware.js';

const router = Router();

// Este router é montado em `/api` (sem prefixo próprio), então NÃO usar `router.use()`
// — ele pegaria todo `/api/*`, inclusive `/api/superadmin`. Middleware por rota.
const guard = [autenticarToken, somenteTenant];

router.post('/pallets', guard, criarPallet);
router.get('/pallets', guard, listarPallets);
router.get('/pallets/:identificador', guard, buscarPalletPorIdentificador);

router.get('/historico/exportar-rma', guard, exportarRelatorioRMA);
router.post('/historico/exportar', guard, exportarHistoricoExcel);
router.get('/historico/exportar-geral', guard, exportarRelatorioGeralItens);

router.post('/pallets/lancar-novo', guard, lancarPalletNovo);

router.get('/historico/:codigoItem', guard, buscarHistoricoItem);

router.post('/pallets/bipar', guard, biparItem);
router.post('/pallets/enviar-rma', guard, enviarParaRMA);
router.put('/pallets/transferir', guard, transferirUm);
router.put('/pallets/transferir-lote', guard, transferirEmLote);
router.delete('/pallets/:identificador', guard, excluirPallet);
router.post('/pallets/bipar-lote', guard, biparItemEmLote);

export default router;
