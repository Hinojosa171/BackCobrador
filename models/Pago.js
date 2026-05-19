const mongoose = require('mongoose');

const PagoSchema = new mongoose.Schema({
  creditoID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Credito',
    required: true
  },
  clienteID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  cobradorID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cobrador'
  },
  monto: {
    type: Number,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  metodo: {
    type: String,
    enum: ['efectivo', 'transferencia', 'telegram', 'otro'],
    default: 'telegram'
  },
  descripcion: String,
  telegramID: {
    type: Number,
    description: 'ID de chat de Telegram que registró el pago'
  },
  estado: {
    type: String,
    enum: ['confirmado', 'pendiente', 'rechazado'],
    default: 'confirmado'
  }
});

module.exports = mongoose.model('Pago', PagoSchema);
