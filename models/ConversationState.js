const mongoose = require('mongoose');

const ConversationStateSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true,
    unique: true
  },
  userId: {
    type: Number,
    required: true
  },
  estado: {
    type: String,
    enum: ['autenticar_cedula', 'menu', 'crear_cliente_nombre', 'crear_cliente_telefono', 'crear_cliente_cedula', 'crear_cliente_direccion',
           'crear_credito_telefono', 'crear_credito_monto',
           'pagar_telefono', 'pagar_monto', 'consultar_telefono'],
    default: 'autenticar_cedula'
  },
  cobradorID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cobrador'
  },
  cedulaCobrador: String,
  datosTemporales: {
    tipo: String,
    nombre: String,
    telefono: String,
    cedula: String,
    direccion: String,
    clienteID: mongoose.Schema.Types.ObjectId,
    creditoID: mongoose.Schema.Types.ObjectId,
    nombreCliente: String,
    montoBase: Number,
    montoRestante: Number,
    monto: Number,
    tasa: Number
  },
  ultimaInteraccion: {
    type: Date,
    default: Date.now
  }
});

// Limpiar estados antiguos (más de 1 hora sin interacción)
ConversationStateSchema.index({ ultimaInteraccion: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('ConversationState', ConversationStateSchema);
