import { Router } from 'express';
import { listarUsuarios, criarUsuario, excluirUsuario } from '../controllers/usuarioController.js';
import { autenticarToken, somenteTenant } from '../middlewares/authMiddleware.js';
import { atualizarCargoUsuario } from '../controllers/usuarioController.js';

const router = Router();

router.use(autenticarToken, somenteTenant);

router.get('/', listarUsuarios);
router.post('/', criarUsuario);
router.delete('/:id', excluirUsuario);
router.put('/:id/cargo', atualizarCargoUsuario);

export default router;