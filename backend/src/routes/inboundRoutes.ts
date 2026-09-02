import { Router } from 'express';
import multer from 'multer';
import {
  processarInboundPdf,
  cadastrarMotorista,
  cadastrarVeiculo,
  listarDashboard,
  finalizarInbound,
  acaoCoordenador,
} from '../controllers/inboundController.js';
import { autenticarToken, somenteTenant } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Todas as rotas de inbound exigem autenticação + conta de empresa (o tenant vem do token).
router.use(autenticarToken, somenteTenant);

router.post('/upload', upload.single('inboundPdf'), processarInboundPdf);
router.post('/motoristas', cadastrarMotorista);
router.post('/veiculos', cadastrarVeiculo);
router.get('/dashboard', listarDashboard);
router.put('/:id/finalizar', finalizarInbound);
router.post('/:id/coordenador', acaoCoordenador);

export default router;
