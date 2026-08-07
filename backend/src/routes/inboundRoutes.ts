import { Router } from 'express';
import multer from 'multer';
import { processarInboundPdf } from '../controllers/inboundController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rota POST que recebe o arquivo PDF e o nome do pallet
router.post('/upload', upload.single('inboundPdf'), processarInboundPdf);

export default router;