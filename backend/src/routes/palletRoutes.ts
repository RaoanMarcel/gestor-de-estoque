import { Router } from 'express';
import { criarPallet, buscarPalletPorId, listarPallets, biparItem } from '../controllers/palletController.js';

const router = Router();

// Rotas de Gestão do Pallet
router.post('/pallets', criarPallet);
router.get('/pallets', listarPallets);
router.get('/pallets/:id', buscarPalletPorId);

// Rota Operacional (O Bip do leitor)
router.post('/pallets/bipar', biparItem);

export default router;