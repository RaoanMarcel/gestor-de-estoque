import { Router } from 'express';
import multer from 'multer';
import {
  listarDashboard,
  agendarRecebimento,
  importarXml,
  atualizarConferencia,
  acaoRecebimento,
} from '../controllers/recebimentoController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Lista todos os recebimentos para a tela inicial
router.get('/dashboard', autenticarToken, listarDashboard);

// Agenda a entrega de uma NF (sem XML ainda)
router.post('/agendar', autenticarToken, agendarRecebimento);

// Importa o XML da NF-e (cria um recebimento novo ou preenche um agendamento)
router.post('/importar-xml', autenticarToken, upload.single('xml'), importarXml);

// Salva o progresso da conferência (bipagem) dos itens
router.put('/:id/conferencia', autenticarToken, atualizarConferencia);

// Excluir / Finalizar recebimento
router.post('/:id/acao', autenticarToken, acaoRecebimento);

export default router;
