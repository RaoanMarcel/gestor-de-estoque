import { Router, Request, Response, NextFunction } from 'express';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { getAuth } from '../lib/auth.js';
import {
  listarModulos,
  listarTenants,
  criarTenant,
  atualizarTenant,
  listarUsuariosDoTenant,
  adicionarUsuarioNoTenant,
  removerUsuarioDoTenant,
} from '../controllers/superadminController.js';

const router = Router();

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!getAuth(req)?.isSuperAdmin) {
    return res.status(403).json({ error: 'Acesso restrito ao super-admin.' });
  }
  next();
};

router.use(autenticarToken, requireSuperAdmin);

router.get('/modulos', listarModulos);

router.get('/tenants', listarTenants);
router.post('/tenants', criarTenant);
router.patch('/tenants/:id', atualizarTenant);

router.get('/tenants/:id/usuarios', listarUsuariosDoTenant);
router.post('/tenants/:id/usuarios', adicionarUsuarioNoTenant);
router.delete('/tenants/:id/usuarios/:usuarioId', removerUsuarioDoTenant);

export default router;
