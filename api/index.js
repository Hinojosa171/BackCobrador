const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ CONFIGURACIÓN DE CORS PARA PRODUCCIÓN Y DESARROLLO
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'https://front-cobrador.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Permitir cualquier *.vercel.app en producción
    const isVercelDomain = origin && origin.includes('.vercel.app');
    
    // Permitir peticiones sin origin (como mobile apps o curl)
    if (!origin || allowedOrigins.includes(origin) || isVercelDomain) {
      console.log(`✅ Origen permitido: ${origin || 'sin origen'}`);
      callback(null, true);
    } else {
      console.warn(`⚠️ Origen bloqueado: ${origin}`);
      callback(new Error('CORS no permitido'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());


const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI no está configurado en .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    console.log(`📍 Base de datos: ${MONGO_URI.split('/').pop().split('?')[0]}`);
  })
  .catch(err => {
    console.error("❌ Error de conexión a MongoDB:", err.message);
    console.error("📍 URL utilizada:", MONGO_URI);
    process.exit(1);
  });

// ✅ VERIFICAR CONFIGURACIÓN DE TELEGRAM
if (process.env.TELEGRAM_TOKEN) {
  console.log("🤖 Bot de Telegram conectado");
  console.log(`📱 Token: ${process.env.TELEGRAM_TOKEN.substring(0, 10)}...`);
} else {
  console.warn("⚠️  TELEGRAM_TOKEN no configurado en .env");
}

const Cobrador = require('../models/Cobrador');
const Cliente = require('../models/Cliente');
const Credito = require('../models/Credito');
const Oficina = require('../models/Oficina');
const Gerente = require('../models/Gerente');
const Barrio = require('../models/Barrio');
const { crearCredito } = require('../controllers/creditoController');
const { 
  crearGerente,
  loginGerente,
  obtenerGerente,
  crearBarrio,
  obtenerBarrios,
  crearOficina,
  obtenerOficinasGerente,
  asignarBarriosOficina,
  crearCobradorOficina,
  estadisticasGerente
} = require('../controllers/gerenteController');
const telegramController = require('../controllers/telegramController');
const ragController = require('../controllers/ragController');
const ragRoutes = require('../routes/ragRoutes');
const TelegramRAGService = require('../services/telegramRAGService');

// ✅ INICIALIZAR BOT TELEGRAM RAG (si está configurado)
let telegramRAGBot = null;
if (process.env.TELEGRAM_TOKEN) {
  try {
    telegramRAGBot = new TelegramRAGService(process.env.TELEGRAM_TOKEN);
    console.log('✅ Telegram RAG Bot iniciado y esperando mensajes');
  } catch (error) {
    console.error('⚠️  Error iniciando Telegram RAG Bot:', error.message);
  }
}

// RUTA DE PRUEBA: Escribe http://localhost:3000/api/test en tu navegador
app.get('/api/test', (req, res) => {
  res.json({ mensaje: "¡El backend está vivo y respondiendo!" });
});

// ============================================
// RUTAS FILTRADAS POR OFICINA
// ============================================

// OBTENER COBRADORES DE UNA OFICINA
app.get('/api/oficinas/:oficinaId/cobradores', async (req, res) => {
  try {
    const { oficinaId } = req.params;
    const cobradores = await Cobrador.find({ oficinaID: oficinaId });
    res.json(cobradores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OBTENER CLIENTES DE UNA OFICINA
app.get('/api/oficinas/:oficinaId/clientes', async (req, res) => {
  try {
    const { oficinaId } = req.params;
    const clientes = await Cliente.find({ oficinaID: oficinaId });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OBTENER CRÉDITOS DE UNA OFICINA
app.get('/api/oficinas/:oficinaId/creditos', async (req, res) => {
  try {
    const { oficinaId } = req.params;
    const creditos = await Credito.find({ oficinaID: oficinaId })
      .populate('clienteID', 'nombre cedula telefono')
      .populate('cobradorID', 'nombre');
    res.json(creditos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RUTAS DEL GERENTE
// ============================================

// CREAR GERENTE
app.post('/api/gerentes', crearGerente);

// LOGIN GERENTE
app.post('/api/gerentes/login', loginGerente);

// OBTENER DATOS DEL GERENTE
app.get('/api/gerentes/:id', obtenerGerente);

// CREAR BARRIO
app.post('/api/barrios', crearBarrio);

// OBTENER TODOS LOS BARRIOS
app.get('/api/barrios', obtenerBarrios);

// CREAR OFICINA DESDE GERENTE
app.post('/api/gerentes/oficinas/crear', crearOficina);

// OBTENER OFICINAS DEL GERENTE
app.get('/api/gerentes/:gerenteID/oficinas', obtenerOficinasGerente);

// ASIGNAR BARRIOS A UNA OFICINA
app.post('/api/oficinas/asignar-barrios', asignarBarriosOficina);

// CREAR COBRADOR EN UNA OFICINA
app.post('/api/oficinas/cobradores/crear', crearCobradorOficina);

// OBTENER ESTADÍSTICAS DEL GERENTE
app.get('/api/gerentes/:gerenteID/estadisticas', estadisticasGerente);

// ============================================
// FIN RUTAS DEL GERENTE
// ============================================

// ============================================
// RUTA GET PARA OBTENER TODOS LOS CRÉDITOS
app.get('/api/creditos', async (req, res) => {
  try {
    const creditos = await Credito.find()
      .populate('clienteID', 'nombre cedula telefono')
      .populate('cobradorID', 'nombre');
    res.json(creditos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RUTA POST PARA CREAR CRÉDITOS
app.post('/api/creditos', crearCredito);

// RUTA PUT PARA DESACTIVAR/ACTIVAR COBRADORES
app.put('/api/cobradores/:id/toggle-activo', async (req, res) => {
  try {
    const cobrador = await Cobrador.findById(req.params.id);
    
    if (!cobrador) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    // Invertir el estado activo
    cobrador.activo = !cobrador.activo;
    await cobrador.save();

    res.json({
      mensaje: cobrador.activo ? '✅ Cobrador activado' : '✅ Cobrador desactivado',
      cobrador: cobrador
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// RUTA PUT PARA ACTUALIZAR CRÉDITOS (marcar como pagado)
app.put('/api/creditos/:id', async (req, res) => {
  try {
    const creditoActualizado = await Credito.findByIdAndUpdate(
      req.params.id,
      { 
        estado: req.body.estado,
        fecha_pago: req.body.estado === 'Realizado' ? new Date() : null
      },
      { new: true }
    );
    res.json(creditoActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RUTAS DE TELEGRAM BOT
// ============================================

// WEBHOOK DE TELEGRAM - Recibe mensajes
app.post('/api/telegram/webhook', telegramController.webhook);

// CONFIGURAR WEBHOOK
// POST /api/telegram/setup-webhook?url=https://tudominio.com/api/telegram/webhook
app.post('/api/telegram/setup-webhook', telegramController.configurarWebhook);

// OBTENER INFORMACIÓN DEL WEBHOOK
app.get('/api/telegram/webhook-info', telegramController.obtenerInfoWebhook);

// ELIMINAR WEBHOOK
app.delete('/api/telegram/delete-webhook', telegramController.eliminarWebhook);

// ENVIAR MENSAJE DE PRUEBA
app.post('/api/telegram/test-message', telegramController.enviarMensajePrueba);

// OBTENER INFO DEL BOT
app.get('/api/telegram/bot-info', telegramController.obtenerInfoBot);

// ============================================
// RUTAS DE RAG (RETRIEVAL-AUGMENTED GENERATION)
// ============================================

// Usar rutas de RAG
app.use('/api/rag', ragRoutes);

// ============================================
// FIN RUTAS DE RAG
// ============================================

// MIDDLEWARE DE MANEJO GLOBAL DE ERRORES
app.use((err, req, res, next) => {
  console.error('❌ Error no controlado:', err.message);
  console.error('📍 Stack:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error en el servidor'
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor listo en puerto ${PORT}`);
  console.log(`📍 URL local: http://localhost:${PORT}`);
  console.log('\n✅ Servicios activos:');
  console.log('   ✓ MongoDB Atlas');
  console.log('   ✓ Express API');
  console.log('   ✓ CORS configurado');
  console.log('   ✓ Telegram Bot');
  console.log('\n💡 Para probar: http://localhost:3000/api/test\n');
});

