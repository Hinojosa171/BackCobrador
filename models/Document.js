const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 5000
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

// Sin índice automático — se usa búsqueda por regex como fallback

module.exports = mongoose.model('Document', documentSchema);
