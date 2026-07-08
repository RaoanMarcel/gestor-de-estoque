import { Router } from 'express';
import { criarPallet, buscarPalletPorId, listarPallets, biparItem, transferirUm, transferirEmLote, enviarParaRMA, excluirPallet} from '../controllers/palletController.js';
import { exportarHistoricoExcel, exportarRelatorioRMA } from '../controllers/excelController.js';

const router = Router();

// Rotas de Gestão do Pallet
router.post('/pallets', criarPallet);
router.get('/pallets', listarPallets);
router.get('/pallets/:id', buscarPalletPorId);
router.get('/historico/exportar-rma', exportarRelatorioRMA);

// Rota Operacional (O Bip do leitor)
router.post('/pallets/bipar', biparItem);
router.post('/historico/exportar', exportarHistoricoExcel);
router.post('/pallets/enviar-rma', enviarParaRMA);

router.put('/pallets/transferir', transferirUm);
router.put('/pallets/transferir-lote', transferirEmLote);

router.delete('/pallets/:id', excluirPallet);

export default router;