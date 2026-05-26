const claudeService = require('../services/claudeService');
const mongoVectorService = require('../services/mongoVectorService');
const pdfService = require('../services/pdfService');
const path = require('path');

/**
 * Controlador para operaciones de RAG
 */

/**
 * POST /api/rag/upload-pdf
 * Carga un PDF, lo procesa y lo indexa
 */
exports.subirPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo' });
    }

    console.log(`📤 Procesando PDF: ${req.file.filename}`);

    // Procesar PDF
    const chunks = await pdfService.procesarPDFCompleto(
      req.file.path,
      req.file.originalname
    );

    // Guardar chunks directamente (sin embeddings, usamos búsqueda por texto)
    const docsGuardados = [];

    for (const chunk of chunks) {
      try {
        // Guardar en MongoDB SIN embedding (usar búsqueda por texto)
        const docGuardado = await mongoVectorService.guardarChunk({
          content: chunk.contenido,
          category: chunk.categoria,
          section: chunk.section,
          fileName: chunk.fileName,
          source: chunk.source || 'pdf'
        });

        docsGuardados.push(docGuardado);
        console.log(`✅ Chunk guardado: ${chunk.section}`);
      } catch (error) {
        console.error(`⚠️  Error guardando chunk: ${error.message}`);
      }
    }

    // Limpiar archivo temporal
    pdfService.eliminarArchivo(req.file.path);

    res.json({
      success: true,
      mensaje: `PDF procesado exitosamente`,
      archivo: req.file.originalname,
      chunksCreados: docsGuardados.length,
      documentos: docsGuardados
    });
  } catch (error) {
    console.error('❌ Error subiendo PDF:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/rag/pregunta
 * Procesa una pregunta usando RAG con búsqueda por texto y Claude
 */
exports.procesarPregunta = async (req, res) => {
  try {
    const { pregunta } = req.body;

    if (!pregunta || pregunta.trim().length === 0) {
      return res.status(400).json({ error: 'Pregunta vacía' });
    }

    console.log(`❓ Pregunta: ${pregunta}`);

    // 1. Buscar chunks similares por texto (sin embeddings)
    console.log('📝 Buscando en base de datos...');
    const chunksSimulares = await mongoVectorService.buscarPorTexto(pregunta, 3);

    if (chunksSimulares.length === 0) {
      return res.json({
        pregunta,
        respuesta: '🤷 No encontré información relevante en la base de conocimiento',
        chunks: [],
        fuente: 'base_vacia'
      });
    }

    console.log(`🔍 ${chunksSimulares.length} chunks encontrados`);

    // 2. Generar respuesta con Claude RAG
    let respuesta;
    try {
      respuesta = await claudeService.generarRespuestaRAG(pregunta, chunksSimulares);
      console.log('✅ Respuesta generada con Claude');
    } catch (error) {
      // Fallback: mostrar chunks directamente
      console.log('⚠️  Fallback: mostrando chunks directamente');
      respuesta = chunksSimulares
        .map(c => c.content)
        .join('\n\n---\n\n');
    }

    res.json({
      pregunta,
      respuesta,
      chunks: chunksSimulares.map(c => ({
        contenido: c.content,
        categoria: c.category,
        seccion: c.section
      })),
      fuente: 'rag'
    });
  } catch (error) {
    console.error('❌ Error procesando pregunta:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/rag/documentos
 * Obtiene todos los documentos indexados
 */
exports.obtenerDocumentos = async (req, res) => {
  try {
    const documentos = await mongoVectorService.obtenerTodos();
    res.json({
      total: documentos.length,
      documentos
    });
  } catch (error) {
    console.error('❌ Error obteniendo documentos:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/rag/documentos/:categoria
 * Obtiene documentos por categoría
 */
exports.obtenerPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const documentos = await mongoVectorService.buscarPorCategoria(categoria);
    res.json({
      categoria,
      total: documentos.length,
      documentos
    });
  } catch (error) {
    console.error('❌ Error obteniendo por categoría:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/rag/limpiar
 * Elimina todos los documentos (cuidado!)
 */
exports.limpiarBaseDatos = async (req, res) => {
  try {
    const resultado = await mongoVectorService.limpiarTodos();
    res.json({
      success: true,
      mensaje: 'Base de datos limpiada',
      eliminados: resultado.deletedCount
    });
  } catch (error) {
    console.error('❌ Error limpiando BD:', error.message);
    res.status(500).json({ error: error.message });
  }
};
