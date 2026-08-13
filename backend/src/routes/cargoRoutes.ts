import { Router } from 'express';
import { listarCargosEUsuarios, criarCargo, atualizarPermissoes, excluirCargo } from '../controllers/cargoController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(autenticarToken);
router.get('/', listarCargosEUsuarios);
router.post('/', criarCargo);
router.put('/:id', atualizarPermissoes);
router.delete('/:id', excluirCargo);

export default router;