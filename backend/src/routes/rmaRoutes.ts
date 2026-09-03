import { Router } from 'express';
import multer from 'multer';
import { autenticarToken, somenteTenant, exigirModulo } from '../middlewares/authMiddleware.js';
import {
  listarRmas, obterRma, listarFontes, listarPalletsTriagem,
  listarFornecedores, criarFornecedor, atualizarFornecedor,
  criarRma, criarDemo, reiniciarDemo, simularRetorno, excluirRma,
  adicionarItens, removerItem, definirDesfecho,
  importarNota, removerNota, confrontarRetorno,
  finalizarRma, cancelarRma, anotar,
} from '../controllers/rmaController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(autenticarToken, somenteTenant, exigirModulo('rma'));

router.get('/', listarRmas);
router.get('/fontes', listarFontes);
router.get('/pallets-triagem', listarPalletsTriagem);
router.get('/fornecedores', listarFornecedores);
router.post('/fornecedores', criarFornecedor);
router.patch('/fornecedores/:id', atualizarFornecedor);
router.post('/demo', criarDemo);
router.post('/', criarRma);

router.get('/:id', obterRma);
router.delete('/:id', excluirRma);
router.post('/:id/reiniciar', reiniciarDemo);
router.post('/:id/simular-retorno', simularRetorno);
router.post('/:id/itens', adicionarItens);
router.delete('/:id/itens/:itemId', removerItem);
router.patch('/:id/itens/:itemId', definirDesfecho);

router.post('/:id/notas', upload.single('xml'), importarNota);
router.delete('/:id/notas/:notaId', removerNota);

router.post('/:id/confronto', confrontarRetorno);
router.post('/:id/finalizar', finalizarRma);
router.post('/:id/cancelar', cancelarRma);
router.post('/:id/anotacoes', anotar);

export default router;
