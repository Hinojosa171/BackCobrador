const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  embedding: {
    type: [Number],
    default: []
  },
  source: {
    type: String,
    enum: ['pdf', 'manual', 'system'],
    default: 'pdf'
  },
  fileName: {
    type: String,
    default: ''
  },
  section: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['sedes', 'cobradores', 'dinero', 'prestamos', 'tasa', 'general', 'oficinas'],
    default: 'general'
  },
  context: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice de texto para búsqueda por palabras clave
documentSchema.index({ content: 'text' });

module.exports = mongoose.model('Document', documentSchema);
