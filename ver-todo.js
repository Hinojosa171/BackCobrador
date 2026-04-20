#!/usr/bin/env node

/**
 * VER TODO LO GUARDADO EN MONGODB
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Cliente = require('./models/Cliente');
const Credito = require('./models/Credito');
const Pago = require('./models/Pago');

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function verTodo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`${colors.green}✅ Conectado a MongoDB\n${colors.blue}═══════════════════════════════════${colors.green}\n`);

    // CLIENTES
    const clientes = await Cliente.find();
    console.log(`${colors.cyan}👥 CLIENTES (${clientes.length}):${colors.green}`);
    clientes.forEach((c, i) => {
      console.log(`\n${i + 1}. ${c.nombre}`);
      console.log(`   📱 Teléfono: ${c.telefono}`);
      console.log(`   🆔 Cédula: ${c.cedula}`);
      console.log(`   📍 Dirección: ${c.direccion}`);
      console.log(`   ✅ Estado: ${c.estado}`);
    });

    // CRÉDITOS
    const creditos = await Credito.find().populate('clienteID', 'nombre telefono');
    console.log(`\n${colors.blue}═══════════════════════════════════\n${colors.cyan}💰 CRÉDITOS (${creditos.length}):${colors.green}`);
    creditos.forEach((c, i) => {
      console.log(`\n${i + 1}. ID: ${c._id}`);
      console.log(`   👤 Cliente: ${c.clienteID?.nombre || 'N/A'}`);
      console.log(`   💵 Monto Base: $${c.montoBase?.toLocaleString()}`);
      console.log(`   📊 Tasa: ${(c.tasaInteres * 100).toFixed(1)}%`);
      console.log(`   🎯 Interés: $${c.interes?.toLocaleString()}`);
      console.log(`   📈 Total: $${c.montoTotal?.toLocaleString()}`);
      console.log(`   ✔️  Pagado: $${(c.montoPagado || 0).toLocaleString()}`);
      console.log(`   🏷️  Estado: ${c.estado}`);
    });

    // PAGOS
    const pagos = await Pago.find().populate('clienteID', 'nombre').populate('creditoID');
    console.log(`\n${colors.blue}═══════════════════════════════════\n${colors.cyan}💳 PAGOS (${pagos.length}):${colors.green}`);
    if (pagos.length === 0) {
      console.log('   (Sin pagos registrados aún)');
    } else {
      pagos.forEach((p, i) => {
        console.log(`\n${i + 1}. Cliente: ${p.clienteID?.nombre}`);
        console.log(`   Monto: $${p.monto?.toLocaleString()}`);
        console.log(`   Fecha: ${new Date(p.fecha).toLocaleDateString()}`);
      });
    }

    console.log(`\n${colors.blue}═══════════════════════════════════\n`);
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verTodo();
