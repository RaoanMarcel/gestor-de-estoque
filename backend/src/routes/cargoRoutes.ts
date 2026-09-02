import { Router } from 'express';
import { listarCargosEUsuarios, criarCargo, atualizarPermissoes, excluirCargo } from '../controllers/cargoController.js';
import { autenticarToken, somenteTenant } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(autenticarToken, somenteTenant);
router.get('/', listarCargosEUsuarios);
router.post('/', criarCargo);
router.put('/:id', atualizarPermissoes);
router.delete('/:id', excluirCargo);

export default router;