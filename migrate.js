#!/usr/bin/env node

/**
 * SCRIPT DE MIGRACIÓN - Limpiar datos antiguos y crear nuevos
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Credito = require('./models/Credito');
const Cliente = require('./models/Cliente');
const Pago = require('./models/Pago');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`${colors.blue}🔄 INICIANDO MIGRACIÓN${colors.reset}\n`);

    // 1. Contar documentos antes
    const creditosAntiguos = await Credito.countDocuments();
    const clientesAntiguos = await Cliente.countDocuments();
    const pagosAntiguos = await Pago.countDocuments();

    console.log(`${colors.yellow}Antes:${colors.reset}`);
    console.log(`  Créditos: ${creditosAntiguos}`);
    console.log(`  Clientes: ${clientesAntiguos}`);
    console.log(`  Pagos: ${pagosAntiguos}\n`);

    // 2. Limpiar colecciones
    console.log(`${colors.blue}🗑️  Limpiando colecciones...${colors.reset}`);
    await Credito.deleteMany({});
    await Pago.deleteMany({});
    await Cliente.deleteMany({});
    console.log(`${colors.green}✅ Limpiado${colors.reset}\n`);

    // 3. Crear nuevo cliente de prueba
    console.log(`${colors.blue}➕ Creando nuevo cliente de prueba...${colors.reset}`);
    const nuevoCliente = await Cliente.create({
      nombre: 'Juan Pérez Testeo',
      cedula: '123456789',
      telefono: '3155555555',
      direccion: 'Calle 5 #10-20',
      estado: 'activo',
      telegramID: 12345
    });
    console.log(`${colors.green}✅ Cliente creado: ${nuevoCliente.nombre}${colors.reset}\n`);

    // 4. Crear nuevo crédito de prueba con NUEVO esquema
    console.log(`${colors.blue}➕ Creando nuevo crédito con esquema correcto...${colors.reset}`);
    const nuevoCredito = await Credito.create({
      clienteID: nuevoCliente._id,
      montoBase: 50000,
      tasaInteres: 0.30,
      // interes y montoTotal se calculan en pre('save')
      estado: 'Pendiente'
    });

    console.log(`${colors.green}✅ Crédito creado:${colors.reset}`);
    console.log(`   montoBase: $${nuevoCredito.montoBase}`);
    console.log(`   tasaInteres: ${(nuevoCredito.tasaInteres * 100).toFixed(1)}%`);
    console.log(`   interes: $${nuevoCredito.interes}`);
    console.log(`   montoTotal: $${nuevoCredito.montoTotal}\n`);

    // 5. Verificar estructura
    console.log(`${colors.blue}🔍 Verificando estructura del crédito...${colors.reset}`);
    const creditoGuardado = await Credito.findById(nuevoCredito._id);
    console.log(`${colors.green}✅ Campos correctos:${colors.reset}`);
    console.log(`   ✓ montoBase: ${creditoGuardado.montoBase !== undefined ? '✅' : '❌'}`);
    console.log(`   ✓ tasaInteres: ${creditoGuardado.tasaInteres !== undefined ? '✅' : '❌'}`);
    console.log(`   ✓ interes: ${creditoGuardado.interes !== undefined ? '✅' : '❌'}`);
    console.log(`   ✓ montoTotal: ${creditoGuardado.montoTotal !== undefined ? '✅' : '❌'}\n`);

    // 6. Resumen
    const creditosNuevos = await Credito.countDocuments();
    const clientesNuevos = await Cliente.countDocuments();

    console.log(`${colors.yellow}Después:${colors.reset}`);
    console.log(`  Créditos: ${creditosNuevos}`);
    console.log(`  Clientes: ${clientesNuevos}`);

    if (creditosNuevos > 0 && creditoGuardado.montoBase > 0) {
      console.log(`\n${colors.green}✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!${colors.reset}`);
      console.log(`\nAhora ejecuta: node test-telegram.js`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

migrate();
