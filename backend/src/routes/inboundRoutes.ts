import { Router } from 'express';
import multer from 'multer';
import { 
  processarInboundPdf,
  cadastrarMotorista,
  cadastrarVeiculo,
  listarDashboard,
  finalizarInbound,
  acaoCoordenador
} from '../controllers/inboundController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rota POST que recebe o arquivo TXT/ZPL e o nome do pallet
router.post('/upload', upload.single('inboundPdf'), processarInboundPdf);

// Rotas para cadastro de frota
router.post('/motoristas', cadastrarMotorista);
router.post('/veiculos', cadastrarVeiculo);

// Rota para listar tudo na tela inicial
router.get('/dashboard', listarDashboard);

// Rota para finalizar a carga amarrando o motorista e o veículo
router.put('/:id/finalizar', finalizarInbound);

// Rota para a lixeira e finalização de envio (requer senha)
router.post('/:id/coordenador', acaoCoordenador);

export default router;