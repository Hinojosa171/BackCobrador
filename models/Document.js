const mongoose = require('mongoose');

/**
 * Modelo para almacenar chunks de documentos con embeddings
 * Compatible con MongoDB Vector Search
 */
const documentSchema = new mongoose.Schema({
  // Contenido del chunk
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  
  // Embedding vectorial (1536 dimensiones con Gemini)
  embedding: {
    type: [Number],
    required: true
  },
  
  // Metadatos del documento original
  source: {
    type: String,
    required: true,
    enum: ['pdf', 'manual', 'system'],
    default: 'pdf'
  },
  
  // Nombre del archivo original
  fileName: {
    type: String,
    required: false
  },
  
  // Número de página o sección
  section: {
    type: String,
    required: false
  },
  
  // Categoría o tema
  category: {
    type: String,
    enum: ['sedes', 'cobradores', 'dinero', 'prestamos', 'tasa', 'general', 'oficinas'],
    required: false
  },
  
  // Información relevante para RAG
  context: {
    type: String,
    required: false
  },
  
  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Fecha de última actualización
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice de búsqueda vectorial para MongoDB Atlas Vector Search
documentSchema.index({ embedding: 'cosmosSearch' }, { cosmosSearchOptions: { kind: 'vector-ivf', m: 4, efConstruction: 400, efSearch: 400, metric: 'cosine' } });

// Índice normal para búsquedas por texto
documentSchema.index({ content: 'text', category: 1 });

module.exports = mongoose.model('Document', documentSchema);
