import { Router, Request, Response } from 'express';
import { autenticarToken, somenteTenant } from '../middlewares/authMiddleware.js';
import { getAuth, requireTenantId } from '../lib/auth.js';
import { notificarTenant } from '../lib/notificacoes.js';

const router = Router();
router.use(autenticarToken, somenteTenant);

router.post('/testar', (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req);
    const quem = getAuth(req)?.username || 'alguém';
    const texto = String(req.body?.texto || '').trim() || `Notificação de teste enviada por ${quem}.`;
    notificarTenant(tenantId, { tipo: 'SISTEMA', titulo: 'Teste', texto });
    return res.json({ ok: true });
  } catch (error) {
    console.error('[ERRO POST /notificacoes/testar]', error);
    return res.status(500).json({ error: 'Erro ao enviar a notificação de teste.' });
  }
});

export default router;
