import { Router } from 'express';
import { autenticarToken, somenteTenant, exigirModulo } from '../middlewares/authMiddleware.js';
import {
  exigirSenhaMascara,
  verificarSenha,
  definirSenha,
  listarMascaras,
  sincronizarMascaras,
} from '../controllers/mascaraAdminController.js';

const router = Router();

// Gerenciamento de máscaras é do fluxo do Mercado Full — exige auth + conta de empresa + módulo "full".
router.use(autenticarToken, somenteTenant, exigirModulo('full'));

// Definir/trocar a senha exige só o login normal (ela própria é a trava de quem já está logado).
router.put('/senha', definirSenha);
router.post('/senha/verificar', verificarSenha);

// Ler e editar as máscaras exige também a senha extra (ver exigirSenhaMascara).
router.get('/', exigirSenhaMascara, listarMascaras);
router.put('/sincronizar', exigirSenhaMascara, sincronizarMascaras);

export default router;
