const mongoose = require('mongoose');
const CreditoSchema = new mongoose.Schema({
  montoBase: { type: Number, required: true },
  tasaInteres: { type: Number, required: true },
  interes: { type: Number, default: 0 },
  montoTotal: { type: Number, default: 0 },
  montoPagado: { type: Number, default: 0 },
  estado: { type: String, default: 'Pendiente', enum: ['Pendiente', 'Pagado', 'Vencido'] },
  fechaCreacion: { type: Date, default: Date.now },
  fechaVencimiento: Date,
  fechaPago: Date,
  clienteID: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  cobradorID: { type: mongoose.Schema.Types.ObjectId, ref: 'Cobrador' },
  oficinaID: { type: mongoose.Schema.Types.ObjectId, ref: 'Oficina' }
});

// Lógica para calcular interés automáticamente ANTES de validar
CreditoSchema.pre('validate', function(next) {
  if (this.montoBase && this.tasaInteres) {
    this.interes = this.montoBase * this.tasaInteres;
    this.montoTotal = this.montoBase + this.interes;
  }
  next();
});

module.exports = mongoose.model('Credito', CreditoSchema);