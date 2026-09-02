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
import { autenticarToken, somenteTenant, exigirModulo } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Inbound é o fluxo do Mercado Full — exige auth + conta de empresa + o módulo "full".
router.use(autenticarToken, somenteTenant, exigirModulo('full'));

router.post('/upload', upload.single('inboundPdf'), processarInboundPdf);
router.post('/motoristas', cadastrarMotorista);
router.post('/veiculos', cadastrarVeiculo);
router.get('/dashboard', listarDashboard);
router.put('/:id/finalizar', finalizarInbound);
router.post('/:id/coordenador', acaoCoordenador);

export default router;
