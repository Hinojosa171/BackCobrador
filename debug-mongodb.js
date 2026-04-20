#!/usr/bin/env node

/**
 * DEBUG - Ver exactamente qué hay en MongoDB
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Credito = require('./models/Credito');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado\n');

    // Ver un crédito sin populate
    const creditos = await Credito.find().limit(5);
    
    console.log('📊 Créditos en BD:\n');
    creditos.forEach((c, i) => {
      console.log(`${i + 1}. ID: ${c._id}`);
      console.log(`   Schema keys:`, Object.keys(c.toObject()));
      console.log(`   montoBase:`, c.montoBase);
      console.log(`   tasaInteres:`, c.tasaInteres);
      console.log(`   interes:`, c.interes);
      console.log(`   montoTotal:`, c.montoTotal);
      console.log(`   clienteID:`, c.clienteID);
      console.log('');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debug();
