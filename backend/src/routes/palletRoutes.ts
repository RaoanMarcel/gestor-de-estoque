import { Router } from 'express';
import { 
  criarPallet, buscarPalletPorId, listarPallets, biparItem, 
  transferirUm, transferirEmLote, enviarParaRMA, excluirPallet, biparItemEmLote
} from '../controllers/palletController.js';
import { exportarHistoricoExcel, exportarRelatorioRMA } from '../controllers/excelController.js';

// Importe o seu middleware (lembre-se do .js no final se o seu projeto estiver usando ES Modules)
import { autenticarToken } from '../middlewares/authMiddleware.js'; 

const router = Router();

// Rotas de Gestão do Pallet (Todas protegidas)
router.post('/pallets', autenticarToken, criarPallet);
router.get('/pallets', autenticarToken, listarPallets);
router.get('/pallets/:id', autenticarToken, buscarPalletPorId);

// Rotas de Excel (Protegidas)
router.get('/historico/exportar-rma', autenticarToken, exportarRelatorioRMA);
router.post('/historico/exportar', autenticarToken, exportarHistoricoExcel);

// Rotas Operacionais (Protegidas)
router.post('/pallets/bipar', autenticarToken, biparItem);
router.post('/pallets/enviar-rma', autenticarToken, enviarParaRMA);
router.put('/pallets/transferir', autenticarToken, transferirUm);
router.put('/pallets/transferir-lote', autenticarToken, transferirEmLote);
router.delete('/pallets/:id', autenticarToken, excluirPallet);
router.post('/pallets/bipar-lote', autenticarToken, biparItemEmLote);

export default router;