import { Router } from 'express';
import multer from 'multer';
import {
  listarDashboard,
  criarRecebimento,
  agendarRecebimento,
  importarXml,
  atualizarConferencia,
  acaoRecebimento,
} from '../controllers/recebimentoController.js';
import { autenticarToken, somenteTenant, exigirModulo } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Todas as rotas exigem auth + conta de empresa + o módulo "recebimento".
router.use(autenticarToken, somenteTenant, exigirModulo('recebimento'));

// Lista todos os recebimentos para a tela inicial
router.get('/dashboard', listarDashboard);

router.post('/', criarRecebimento);

router.post('/:id/agendar', agendarRecebimento);

// Importa o XML da NF-e (cria um recebimento novo ou preenche um agendamento)
router.post('/importar-xml', upload.single('xml'), importarXml);

// Salva o progresso da conferência (bipagem) dos itens
router.put('/:id/conferencia', atualizarConferencia);

// Excluir / Finalizar recebimento
router.post('/:id/acao', acaoRecebimento);

export default router;
