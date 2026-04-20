const mongoose = require('mongoose');
const ClienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  cedula: { type: String, unique: true, required: true },
  telefono: String,
  email: String,
  direccion: String,
  estado: { type: String, default: 'activo', enum: ['activo', 'inactivo', 'bloqueado'] },
  telegramID: Number,
  cobradorID: { type: mongoose.Schema.Types.ObjectId, ref: 'Cobrador' },
  oficinaID: { type: mongoose.Schema.Types.ObjectId, ref: 'Oficina' },
  fechaCreacion: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Cliente', ClienteSchema);