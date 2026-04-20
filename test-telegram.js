#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA AUTOMÁTICA - TELEGRAM BOT
 * Valida que todos los flujos funcionen correctamente
 * 
 * Uso: node test-telegram.js
 */

const axios = require('axios');
const BACKEND_URL = 'http://localhost:3000';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testsPasados = 0;
let testsFallidos = 0;

async function test(nombre, fn) {
  try {
    await fn();
    console.log(`${colors.green}✅ ${nombre}${colors.reset}`);
    testsPasados++;
  } catch (error) {
    console.log(`${colors.red}❌ ${nombre}${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    testsFallidos++;
  }
}

async function main() {
  console.log(`${colors.blue}🤖 INICIANDO PRUEBAS DEL BOT DE TELEGRAM${colors.reset}\n`);

  // 1. Probar que el backend esté corriendo
  await test('Backend responde en puerto 3000', async () => {
    const response = await axios.get(`${BACKEND_URL}/api/test`);
    if (!response.data.mensaje) throw new Error('Backend no respondió correctamente');
  });

  // 2. Simular webhook de Telegram
  console.log(`\n${colors.blue}📝 Prueba 1: Crear Cliente${colors.reset}`);
  
  const chatId = Math.floor(Math.random() * 1000000);
  const userId = Math.floor(Math.random() * 1000000);

  // Mensaje 1: /start
  await test('Enviar comando /start', async () => {
    const payload = {
      update_id: 1,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: '/start'
      }
    };
    
    const response = await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Simular clic en botón "Crear Cliente"
  await test('Clic en botón "Crear Cliente"', async () => {
    const payload = {
      update_id: 2,
      callback_query: {
        id: `query_${Date.now()}`,
        from: { id: userId, first_name: 'Test' },
        chat_instance: '1234567890',
        data: 'crear_cliente',
        message: {
          message_id: 1,
          chat: { id: chatId, type: 'private' },
          date: Math.floor(Date.now() / 1000)
        }
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Mensaje 2: Nombre del cliente
  await test('Enviar nombre del cliente', async () => {
    const payload = {
      update_id: 3,
      message: {
        message_id: 2,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: 'Juan Pérez'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Mensaje 3: Teléfono
  await test('Enviar teléfono del cliente', async () => {
    const payload = {
      update_id: 4,
      message: {
        message_id: 3,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: '3155555555'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Mensaje 4: Cédula
  await test('Enviar cédula del cliente', async () => {
    const payload = {
      update_id: 5,
      message: {
        message_id: 4,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: '1234567890'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Mensaje 5: Dirección
  await test('Enviar dirección del cliente', async () => {
    const payload = {
      update_id: 6,
      message: {
        message_id: 5,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: 'Calle 5 #10-20'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Esperar a que se guarde el cliente
  await new Promise(r => setTimeout(r, 1000));

  // 2. Crear Crédito
  console.log(`\n${colors.blue}💰 Prueba 2: Crear Crédito${colors.reset}`);

  // Clic en "Crear Crédito"
  await test('Clic en botón "Crear Crédito"', async () => {
    const payload = {
      update_id: 7,
      callback_query: {
        id: `query_${Date.now()}`,
        from: { id: userId, first_name: 'Test' },
        chat_instance: '1234567890',
        data: 'crear_credito',
        message: {
          message_id: 1,
          chat: { id: chatId, type: 'private' },
          date: Math.floor(Date.now() / 1000)
        }
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Teléfono para buscar cliente
  await test('Enviar teléfono para crear crédito', async () => {
    const payload = {
      update_id: 8,
      message: {
        message_id: 6,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: '3155555555'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Monto
  await test('Enviar monto del crédito', async () => {
    const payload = {
      update_id: 9,
      message: {
        message_id: 7,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: '50000'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Tasa de interés
  await test('Enviar tasa de interés', async () => {
    const payload = {
      update_id: 10,
      message: {
        message_id: 8,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: '0.30'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  await new Promise(r => setTimeout(r, 1000));

  // 3. Consultar Cliente
  console.log(`\n${colors.blue}🔍 Prueba 3: Consultar Cliente${colors.reset}`);

  await test('Clic en botón "Consultar Cliente"', async () => {
    const payload = {
      update_id: 11,
      callback_query: {
        id: `query_${Date.now()}`,
        from: { id: userId, first_name: 'Test' },
        chat_instance: '1234567890',
        data: 'consultar_cliente',
        message: {
          message_id: 1,
          chat: { id: chatId, type: 'private' },
          date: Math.floor(Date.now() / 1000)
        }
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  await test('Enviar teléfono para consultar', async () => {
    const payload = {
      update_id: 12,
      message: {
        message_id: 9,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: 'private' },
        from: { id: userId, first_name: 'Test' },
        text: '3155555555'
      }
    };
    
    await axios.post(
      `${BACKEND_URL}/api/telegram/webhook`,
      payload
    );
  });

  // Resumen
  console.log(`\n${colors.blue}📊 RESUMEN DE PRUEBAS${colors.reset}`);
  console.log(`${colors.green}✅ Pasadas: ${testsPasados}${colors.reset}`);
  console.log(`${colors.red}❌ Fallidas: ${testsFallidos}${colors.reset}`);

  if (testsFallidos === 0) {
    console.log(`\n${colors.green}🎉 ¡TODAS LAS PRUEBAS PASARON!${colors.reset}`);
    console.log(`\nVerifica en MongoDB que se crearon:`);
    console.log(`  1. Cliente: Juan Pérez (3155555555)`);
    console.log(`  2. Crédito: $50,000 con 30% interés = $15,000 (Total $65,000)`);
  } else {
    console.log(`\n${colors.red}⚠️ REVISA LOS ERRORES ARRIBA${colors.reset}`);
  }

  process.exit(testsFallidos > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${colors.red}❌ Error fatal:${colors.reset}`, err.message);
  process.exit(1);
});
