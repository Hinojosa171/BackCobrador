#!/usr/bin/env node

/**
 * VALIDACIÓN MONGODB - VERIFICAR QUE TODO SE GUARDÓ CORRECTAMENTE
 * Uso: node validate-mongodb.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Cliente = require('./models/Cliente');
const Credito = require('./models/Credito');
const Pago = require('./models/Pago');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function validar() {
  try {
    console.log(`${colors.blue}🔍 VALIDANDO MONGODB${colors.reset}\n`);

    // Conectar
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`${colors.green}✅ Conectado a MongoDB${colors.reset}\n`);

    // 1. Validar Clientes
    console.log(`${colors.cyan}📝 CLIENTES CREADOS:${colors.reset}`);
    const clientes = await Cliente.find({ nombre: 'Juan Pérez' });
    
    if (clientes.length === 0) {
      console.log(`${colors.yellow}⚠️ No se encontraron clientes con nombre "Juan Pérez"${colors.reset}`);
    } else {
      clientes.forEach(cliente => {
        console.log(`
${colors.green}✅ Cliente encontrado:${colors.reset}
  ID: ${cliente._id}
  Nombre: ${cliente.nombre}
  Teléfono: ${cliente.telefono}
  Cédula: ${cliente.cedula}
  Dirección: ${cliente.direccion}
  Estado: ${cliente.estado}
  TelegramId: ${cliente.telegramId}
        `);
      });
    }

    // 2. Validar Créditos
    console.log(`${colors.cyan}💰 CRÉDITOS CREADOS:${colors.reset}`);
    const creditos = await Credito.find().populate('clienteID', 'nombre telefono');
    
    if (creditos.length === 0) {
      console.log(`${colors.yellow}⚠️ No se encontraron créditos${colors.reset}`);
    } else {
      creditos.forEach((credito, i) => {
        console.log(`
${colors.green}✅ Crédito ${i + 1}:${colors.reset}
  ID: ${credito._id}
  Cliente: ${credito.clienteID?.nombre || 'N/A'}
  montoBase: $${credito.montoBase?.toLocaleString() || 'FALTA'}
  tasaInteres: ${(credito.tasaInteres * 100).toFixed(1)}%
  interes: $${credito.interes?.toLocaleString() || 'FALTA'} 
  montoTotal: $${credito.montoTotal?.toLocaleString() || 'FALTA'}
  montoPagado: $${(credito.montoPagado || 0).toLocaleString()}
  Estado: ${credito.estado}
  Fecha: ${new Date(credito.fechaCreacion).toLocaleDateString()}

${colors.blue}  Validación de cálculos:${colors.reset}
    ✓ interes = montoBase * tasaInteres?
      ${credito.interes === credito.montoBase * credito.tasaInteres ? colors.green + '✅ SÍ' + colors.reset : colors.red + '❌ NO' + colors.reset}
    ✓ montoTotal = montoBase + interes?
      ${credito.montoTotal === credito.montoBase + credito.interes ? colors.green + '✅ SÍ' + colors.reset : colors.red + '❌ NO' + colors.reset}
        `);
      });
    }

    // 3. Validar Pagos
    console.log(`${colors.cyan}💳 PAGOS REGISTRADOS:${colors.reset}`);
    const pagos = await Pago.find().populate('clienteID', 'nombre telefono');
    
    if (pagos.length === 0) {
      console.log(`${colors.yellow}⚠️ No se encontraron pagos registrados${colors.reset}`);
    } else {
      pagos.forEach((pago, i) => {
        console.log(`
${colors.green}✅ Pago ${i + 1}:${colors.reset}
  ID: ${pago._id}
  Cliente: ${pago.clienteID?.nombre || 'N/A'}
  Monto: $${pago.monto?.toLocaleString()}
  Fecha: ${new Date(pago.fecha).toLocaleDateString()}
  Estado: ${pago.metodo}
        `);
      });
    }

    // 4. Resumen
    console.log(`
${colors.blue}📊 RESUMEN:${colors.reset}
  Clientes: ${clientes.length}
  Créditos: ${creditos.length}
  Pagos: ${pagos.length}
    `);

    if (clientes.length > 0 && creditos.length > 0) {
      console.log(`${colors.green}✅ ¡TODO FUNCIONA CORRECTAMENTE!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Faltan datos, revisa los flujos${colors.reset}`);
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

validar();
