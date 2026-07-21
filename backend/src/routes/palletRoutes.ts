import { Router } from 'express';
import { 
  criarPallet, buscarPalletPorIdentificador, listarPallets, biparItem, 
  transferirUm, transferirEmLote, enviarParaRMA, excluirPallet, biparItemEmLote
} from '../controllers/palletController.js';
import { exportarHistoricoExcel, exportarRelatorioRMA } from '../controllers/excelController.js';

// 🔄 CORREÇÃO: Descomentado e restaurado para parar os erros 404
import { buscarHistoricoItem } from '../controllers/historicoController.js'; 

import { autenticarToken } from '../middlewares/authMiddleware.js'; 

const router = Router();

router.post('/pallets', autenticarToken, criarPallet);
router.get('/pallets', autenticarToken, listarPallets);
router.get('/pallets/:identificador', autenticarToken, buscarPalletPorIdentificador);

router.get('/historico/exportar-rma', autenticarToken, exportarRelatorioRMA);
router.post('/historico/exportar', autenticarToken, exportarHistoricoExcel);

// 🔄 CORREÇÃO: Rota devolvida para o frontend conseguir buscar a timeline dos itens
router.get('/historico/:codigoItem', autenticarToken, buscarHistoricoItem);

router.post('/pallets/bipar', autenticarToken, biparItem);
router.post('/pallets/enviar-rma', autenticarToken, enviarParaRMA);
router.put('/pallets/transferir', autenticarToken, transferirUm);
router.put('/pallets/transferir-lote', autenticarToken, transferirEmLote);
router.delete('/pallets/:identificador', autenticarToken, excluirPallet);
router.post('/pallets/bipar-lote', autenticarToken, biparItemEmLote);

export default router;