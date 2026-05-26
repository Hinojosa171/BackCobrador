const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const ragController = require('../controllers/ragController');

// Configurar almacenamiento de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos PDF'));
    }
  }
});

/**
 * Rutas para el sistema RAG
 */

// 📤 Cargar y procesar PDF
// POST /api/rag/upload-pdf
router.post('/upload-pdf', upload.single('pdf'), ragController.subirPDF);

// ❓ Procesar pregunta con RAG
// POST /api/rag/pregunta
router.post('/pregunta', ragController.procesarPregunta);

// 📚 Obtener todos los documentos
// GET /api/rag/documentos
router.get('/documentos', ragController.obtenerDocumentos);

// 📂 Obtener documentos por categoría
// GET /api/rag/documentos/:categoria
router.get('/documentos/:categoria', ragController.obtenerPorCategoria);

// 🗑️ Limpiar base de datos (CUIDADO!)
// DELETE /api/rag/limpiar
router.delete('/limpiar', ragController.limpiarBaseDatos);

module.exports = router;
