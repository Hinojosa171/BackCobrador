const TelegramBot = require('node-telegram-bot-api');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const claudeService = require('./claudeService');
const mongoVectorService = require('./mongoVectorService');
const pdfService = require('./pdfService');
const Oficina = require('../models/Oficina');
const Cobrador = require('../models/Cobrador');
const Cliente = require('../models/Cliente');
const Credito = require('../models/Credito');
const Pago = require('../models/Pago');

// ================================================================
// FUNCIONES DE CONSULTA A LA BASE DE DATOS
// ================================================================
// Estas funciones detectan si la pregunta del usuario es sobre
// datos reales del sistema (cobradores, créditos, pagos, etc.)
// y los consultan directamente en MongoDB.
//
// Ventaja: datos siempre actualizados, no depende de PDFs indexados.
// ================================================================

// Recibe la pregunta y consulta MongoDB según las palabras clave que encuentra.
// Devuelve un objeto con los datos encontrados, o null si no aplica.
async function consultarBD(pregunta) {
  const q = pregunta.toLowerCase();

  // Detectar qué tipo de datos necesita la pregunta
  const esOficina  = /oficin|sede|sucursal/.test(q);
  const esCobrador = /cobrador|agente|recaudador/.test(q);
  const esCliente  = /cliente|deudor/.test(q);
  const esCredito  = /cr[eé]dito|pr[eé]stamo|deuda|monto|dinero|plata|capital/.test(q);
  const esPago     = /pago|cobr[oó]|recaud/.test(q);
  const esTasa     = /tasa|inter[eé]s|porcentaje/.test(q);

  // Si la pregunta no menciona nada del sistema, salir
  if (!esOficina && !esCobrador && !esCliente && !esCredito && !esPago && !esTasa) {
    return null;
  }

  const datos = {};

  if (esOficina) {
    const oficinas = await Oficina.find({}, 'nombre direccion activo').lean();
    datos.oficinas = {
      total: oficinas.length,
      activas: oficinas.filter(o => o.activo).length,
      lista: oficinas.map(o => {
        const dir = o.direccion ? ` (${o.direccion})` : '';
        const estado = o.activo ? '' : ' [inactiva]';
        return `- ${o.nombre}${dir}${estado}`;
      })
    };
  }

  if (esCobrador) {
    const cobradores = await Cobrador.find({}, 'nombre cedula activo').lean();
    datos.cobradores = {
      total: cobradores.length,
      activos: cobradores.filter(c => c.activo).length,
      lista: cobradores.map(c => {
        const estado = c.activo ? '' : ' [inactivo]';
        return `- ${c.nombre} (C.C: ${c.cedula})${estado}`;
      })
    };
  }

  if (esCliente) {
    const clientes = await Cliente.find({}, 'nombre estado').lean();
    datos.clientes = {
      total: clientes.length,
      activos: clientes.filter(c => c.estado === 'activo').length,
      inactivos: clientes.filter(c => c.estado === 'inactivo').length,
      bloqueados: clientes.filter(c => c.estado === 'bloqueado').length
    };
  }

  if (esCredito || esTasa) {
    const creditos = await Credito.find({}, 'montoBase montoTotal montoPagado tasaInteres estado').lean();
    const totalPrestado = creditos.reduce((acc, c) => acc + (c.montoTotal || 0), 0);
    const totalCobrado  = creditos.reduce((acc, c) => acc + (c.montoPagado || 0), 0);
    datos.creditos = {
      total: creditos.length,
      pendientes: creditos.filter(c => c.estado === 'Pendiente').length,
      pagados:    creditos.filter(c => c.estado === 'Pagado').length,
      vencidos:   creditos.filter(c => c.estado === 'Vencido').length,
      totalPrestado: totalPrestado.toLocaleString('es-CO'),
      totalCobrado:  totalCobrado.toLocaleString('es-CO'),
      porCobrar: (totalPrestado - totalCobrado).toLocaleString('es-CO'),
      tasas: [...new Set(creditos.map(c => c.tasaInteres))].map(t => `${(t * 100).toFixed(0)}%`).join(', ')
    };
  }

  if (esPago) {
    const pagos = await Pago.find({}, 'monto estado').lean();
    datos.pagos = {
      total: pagos.length,
      confirmados: pagos.filter(p => p.estado === 'confirmado').length,
      totalMonto: pagos.reduce((acc, p) => acc + (p.monto || 0), 0).toLocaleString('es-CO')
    };
  }

  return datos;
}

// Convierte el objeto de datos de MongoDB en texto legible que Claude puede entender
function construirContextoBD(datos) {
  const lineas = [];

  if (datos.oficinas) {
    const lista = datos.oficinas.lista.length ? `\n${datos.oficinas.lista.join('\n')}` : '';
    lineas.push(`OFICINAS: ${datos.oficinas.total} total, ${datos.oficinas.activas} activas${lista}`);
  }
  if (datos.cobradores) {
    const lista = datos.cobradores.lista.length ? `\n${datos.cobradores.lista.join('\n')}` : '';
    lineas.push(`\nCOBRADORES: ${datos.cobradores.total} total, ${datos.cobradores.activos} activos${lista}`);
  }
  if (datos.clientes) {
    lineas.push(`\nCLIENTES: ${datos.clientes.total} total (activos: ${datos.clientes.activos}, bloqueados: ${datos.clientes.bloqueados})`);
  }
  if (datos.creditos) {
    const tasas = datos.creditos.tasas ? `\n- Tasas de interés: ${datos.creditos.tasas}` : '';
    lineas.push(
      `\nCRÉDITOS: ${datos.creditos.total} total\n` +
      `- Pendientes: ${datos.creditos.pendientes} | Pagados: ${datos.creditos.pagados} | Vencidos: ${datos.creditos.vencidos}\n` +
      `- Total prestado: $${datos.creditos.totalPrestado} | Por cobrar: $${datos.creditos.porCobrar}${tasas}`
    );
  }
  if (datos.pagos) {
    lineas.push(`\nPAGOS: ${datos.pagos.total} registrados (${datos.pagos.confirmados} confirmados) | Total: $${datos.pagos.totalMonto}`);
  }

  return lineas.join('\n');
}

// ================================================================
// CLASE TELEGRAM RAG BOT
// ================================================================
// Maneja todos los mensajes que llegan por Telegram.
//
// CUANDO EL USUARIO ESCRIBE TEXTO:
//   handlePregunta()
//     ├─ Si pregunta sobre el sistema → consulta MongoDB → Claude
//     └─ Si pregunta general         → busca en PDFs indexados → Claude
//
// CUANDO EL USUARIO ENVÍA UN PDF:
//   handleDocumentoPDF()
//     ├─ Descarga el PDF del servidor de Telegram
//     ├─ Extrae el texto
//     ├─ Si tiene preguntas numeradas → responderPreguntasPDF()
//     └─ Si es un documento normal   → indexarPDF()
// ================================================================

class TelegramRAGService {
  constructor(token) {
    this.token = token;
    this.procesando = new Set();
    try {
      // Iniciar sin polling para poder limpiar mensajes viejos primero
      this.bot = new TelegramBot(token, { polling: false });
      this.limpiarYArrancar();
      console.log('🤖 Telegram RAG Bot inicializado');
    } catch (error) {
      console.error('⚠️  Error al iniciar el bot:', error.message);
      this.bot = null;
    }
  }

  // Descarta TODOS los mensajes acumulados mientras el bot estuvo apagado.
  // Sigue pidiendo lotes de 100 hasta que no quede ninguno pendiente.
  async limpiarYArrancar() {
    try {
      let totalDescartados = 0;
      let hayMas = true;

      while (hayMas) {
        const lote = await this.bot.getUpdates({ timeout: 0, limit: 100 });
        if (lote.length === 0) {
          hayMas = false;
        } else {
          const ultimoId = lote[lote.length - 1].update_id;
          // Confirmar a Telegram que ya los procesamos (offset = último + 1)
          await this.bot.getUpdates({ offset: ultimoId + 1, timeout: 0, limit: 1 });
          totalDescartados += lote.length;
          console.log(`🧹 Descartados ${totalDescartados} mensajes acumulados...`);
        }
      }

      if (totalDescartados > 0) {
        console.log(`✅ Cola limpia — ${totalDescartados} mensajes viejos eliminados`);
      } else {
        console.log('✅ Cola vacía, no había mensajes pendientes');
      }
    } catch (e) {
      console.warn('⚠️ No se pudo limpiar la cola:', e.message);
    }

    this.bot.startPolling();
    this.setupHandlers();
    console.log('✅ Bot escuchando mensajes nuevos');
  }

  // Registra qué debe hacer el bot cuando recibe cada tipo de mensaje
  setupHandlers() {
    if (!this.bot) return;

    this.bot.onText(/\/start/,        (msg) => this.handleStart(msg));
    this.bot.onText(/\/ayuda/,        (msg) => this.handleAyuda(msg));
    this.bot.onText(/\/documentos/,   (msg) => this.handleDocumentos(msg));
    this.bot.onText(/\/estadisticas/, (msg) => this.handleEstadisticas(msg));

    // Archivos PDF enviados al bot
    this.bot.on('document', (msg) => this.handleDocumentoPDF(msg));

    // Mensajes de texto (que no sean comandos con /)
    this.bot.on('message', (msg) => {
      if (msg.document) return; // ya lo maneja el handler de 'document'
      if (msg.text && !msg.text.startsWith('/')) this.handlePregunta(msg);
    });

    this.bot.on('polling_error', (err) => {
      if (err.code === 'EFATAL') console.warn('⚠️  Error de conexión con Telegram');
    });

    console.log('✅ Handlers de Telegram configurados');
  }

  // ──────────────────────────────────────────────────────────
  // COMANDOS DEL BOT
  // ──────────────────────────────────────────────────────────

  async handleStart(msg) {
    if (!this.bot) return;
    this.bot.sendMessage(msg.chat.id,
      `¡Bienvenido al Bot del Sistema de Cobranza! 🤖\n\n` +
      `Puedo hacer dos cosas:\n\n` +
      `📄 *Responder preguntas de un PDF*\n` +
      `Envíame un PDF con preguntas numeradas y las respondo automáticamente con IA.\n\n` +
      `💬 *Responder preguntas del sistema*\n` +
      `Pregúntame sobre sedes, cobradores, clientes, créditos o pagos.\n\n` +
      `Comandos:\n` +
      `/estadisticas - Resumen general del sistema\n` +
      `/documentos - Ver documentos indexados\n` +
      `/ayuda - Más información`,
      { parse_mode: 'Markdown' }
    );
  }

  async handleAyuda(msg) {
    if (!this.bot) return;
    this.bot.sendMessage(msg.chat.id,
      `🆘 *AYUDA*\n\n` +
      `*📄 Subir PDF con preguntas:*\n` +
      `Envía un PDF con preguntas numeradas (ej: "1. ¿Qué es...?") y el bot las responde automáticamente.\n\n` +
      `*📚 Indexar un documento:*\n` +
      `Si el PDF no tiene preguntas, se guarda como base de conocimiento para responder consultas futuras.\n\n` +
      `*💬 Preguntar en el chat:*\n` +
      `Escribe directamente tu pregunta sobre el sistema.`,
      { parse_mode: 'Markdown' }
    );
  }

  async handleEstadisticas(msg) {
    if (!this.bot) return;
    try {
      const [oficinas, cobradores, clientes, creditos, pagos] = await Promise.all([
        Oficina.countDocuments(),
        Cobrador.countDocuments({ activo: true }),
        Cliente.countDocuments({ estado: 'activo' }),
        Credito.find({}, 'montoTotal montoPagado estado').lean(),
        Pago.countDocuments({ estado: 'confirmado' })
      ]);

      const totalPrestado = creditos.reduce((acc, c) => acc + (c.montoTotal || 0), 0);
      const totalCobrado  = creditos.reduce((acc, c) => acc + (c.montoPagado || 0), 0);
      const pendientes    = creditos.filter(c => c.estado === 'Pendiente').length;

      this.bot.sendMessage(msg.chat.id,
        `📊 *RESUMEN DEL SISTEMA*\n\n` +
        `🏢 Sedes/Oficinas: ${oficinas}\n` +
        `👷 Cobradores activos: ${cobradores}\n` +
        `👤 Clientes activos: ${clientes}\n` +
        `📋 Créditos pendientes: ${pendientes}\n` +
        `💰 Total prestado: $${totalPrestado.toLocaleString('es-CO')}\n` +
        `✅ Total cobrado: $${totalCobrado.toLocaleString('es-CO')}\n` +
        `⏳ Por cobrar: $${(totalPrestado - totalCobrado).toLocaleString('es-CO')}\n` +
        `🧾 Pagos confirmados: ${pagos}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('❌ Error en /estadisticas:', error.message);
      this.bot.sendMessage(msg.chat.id, '❌ Error obteniendo estadísticas');
    }
  }

  async handleDocumentos(msg) {
    if (!this.bot) return;
    try {
      const documentos = await mongoVectorService.obtenerTodos();

      if (documentos.length === 0) {
        this.bot.sendMessage(msg.chat.id, '📭 No hay documentos indexados.\n\nEnvíame un PDF para indexarlo.');
        return;
      }

      // Agrupar por categoría y contar
      const porCategoria = {};
      documentos.forEach(doc => {
        const cat = doc.category || 'general';
        porCategoria[cat] = (porCategoria[cat] || 0) + 1;
      });

      let texto = `📚 *DOCUMENTOS INDEXADOS* (${documentos.length} secciones)\n\n`;
      for (const [cat, count] of Object.entries(porCategoria)) {
        texto += `📂 ${cat.toUpperCase()}: ${count} secciones\n`;
      }

      this.bot.sendMessage(msg.chat.id, texto, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Error en /documentos:', error.message);
      this.bot.sendMessage(msg.chat.id, '❌ Error obteniendo documentos');
    }
  }

  // ──────────────────────────────────────────────────────────
  // MANEJO DE PDFs ENVIADOS POR TELEGRAM
  // ──────────────────────────────────────────────────────────

  // Punto de entrada cuando el usuario envía un PDF.
  // Decide automáticamente si responder preguntas o indexar el documento.
  async handleDocumentoPDF(msg) {
    if (!this.bot) return;
    const chatId = msg.chat.id;
    const doc = msg.document;

    if (doc?.mime_type !== 'application/pdf') {
      this.bot.sendMessage(chatId, '⚠️ Solo acepto archivos PDF.');
      return;
    }

    // Evitar procesar el mismo archivo dos veces (Telegram a veces envía duplicados)
    const clave = `${chatId}_${doc.file_id}`;
    if (this.procesando.has(clave)) return;
    this.procesando.add(clave);
    setTimeout(() => this.procesando.delete(clave), 60000); // limpiar después de 1 min

    // Aviso inicial que iremos actualizando con el progreso
    const aviso = await this.bot.sendMessage(chatId,
      `📥 Recibí *"${doc.file_name}"*. Procesando...`,
      { parse_mode: 'Markdown' }
    );

    // Crear carpeta temporal si no existe
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const tempPath = path.join(uploadsDir, `tg_${Date.now()}_${doc.file_name}`);

    try {
      // Paso 1: Descargar el PDF del servidor de Telegram a nuestro servidor
      await this.editarMensaje(chatId, aviso.message_id, '⬇️ Descargando PDF...');
      await this.descargarArchivo(doc.file_id, tempPath);
      console.log('✅ PDF descargado en:', tempPath);

      // Paso 2: Leer el texto del PDF
      await this.editarMensaje(chatId, aviso.message_id, '📄 Leyendo texto del PDF...');
      let texto;
      try {
        texto = await pdfService.extraerTexto(tempPath);
        console.log(`✅ Texto extraído: ${texto?.length || 0} caracteres`);
      } catch (pdfError) {
        console.error('❌ Error en pdf-parse:', pdfError.message);
        await this.editarMensaje(chatId, aviso.message_id,
          `❌ No pude leer el PDF: ${pdfError.message}\n\n¿Es un PDF con texto seleccionable? No funciona con PDFs escaneados.`
        );
        return;
      }

      if (!texto || texto.trim().length < 10) {
        await this.editarMensaje(chatId, aviso.message_id,
          '❌ El PDF no tiene texto legible. ¿Es una imagen escaneada?'
        );
        return;
      }

      // Indexar el PDF como base de conocimiento en MongoDB
      // Las preguntas las hace el usuario por chat
      await this.editarMensaje(chatId, aviso.message_id, '✂️ Dividiendo en secciones...');
      const chunks = pdfService.procesarTexto(texto, doc.file_name);
      await this.indexarPDF(chatId, chunks, doc.file_name, aviso.message_id);

    } catch (error) {
      console.error('❌ Error procesando PDF:', error.message);
      console.error(error.stack);
      await this.editarMensaje(chatId, aviso.message_id,
        `❌ Error inesperado: ${error.message}`
      );
    } finally {
      // Siempre eliminar el archivo temporal, haya error o no
      pdfService.eliminarArchivo(tempPath);
    }
  }

  // Extrae las preguntas del PDF, busca contexto en MongoDB y le pide
  // a Claude que las responda todas de una vez.
  async responderPreguntasPDF(chatId, preguntas, fileName, mensajeId) {
    const total = preguntas.length;

    await this.editarMensaje(chatId, mensajeId,
      `📋 Encontré *${total} pregunta(s)* en el PDF\n🔍 Buscando contexto en la base de datos...`,
      'Markdown'
    );

    // Buscar en MongoDB información relevante para las preguntas
    // Usamos todas las preguntas juntas como texto de búsqueda
    const textoBusqueda = preguntas.map(p => p.pregunta).join(' ');
    const chunksContexto = await mongoVectorService.buscarPorTexto(textoBusqueda, 5);

    // Preparar el contexto si hay documentos indexados
    const contexto = chunksContexto.length > 0
      ? chunksContexto.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
      : '';

    // Construir el prompt con todas las preguntas
    const listaPreguntas = preguntas.map(p => `${p.numero}. ${p.pregunta}`).join('\n');

    const prompt =
      `Eres un asistente experto del sistema de cobranza TuCobrador.\n` +
      (contexto ? `\nINFORMACIÓN DISPONIBLE EN EL SISTEMA:\n${contexto}\n` : '') +
      `\nPREGUNTAS A RESPONDER:\n${listaPreguntas}\n\n` +
      `Responde cada pregunta de forma numerada, clara y concisa.`;

    await this.editarMensaje(chatId, mensajeId,
      `📋 *${total} preguntas detectadas*\n🤖 Generando respuestas con IA...`,
      'Markdown'
    );

    // Usar más tokens porque hay que responder varias preguntas
    const respuestas = await claudeService.generarRespuestaSimple(prompt, 2048);

    // Armar el mensaje final
    const encabezado = `📋 *Respuestas del PDF "${fileName}":*\n\n`;
    const mensajeFinal = encabezado + respuestas;

    // Enviar (Telegram tiene límite de 4096 chars por mensaje)
    const partes = this.dividirMensajeLargo(mensajeFinal);
    await this.editarMensaje(chatId, mensajeId, partes[0], 'Markdown');

    for (let i = 1; i < partes.length; i++) {
      await this.bot.sendMessage(chatId, partes[i]);
    }

    console.log(`✅ ${total} preguntas respondidas del PDF "${fileName}"`);
  }

  // Guarda el PDF como base de conocimiento en MongoDB para consultas futuras.
  async indexarPDF(chatId, chunks, fileName, mensajeId) {
    if (chunks.length === 0) {
      await this.editarMensaje(chatId, mensajeId, '❌ No se pudo extraer contenido del PDF.');
      return;
    }

    await this.editarMensaje(chatId, mensajeId, `💾 Indexando ${chunks.length} secciones en la base de datos...`);

    let guardados = 0;
    for (const chunk of chunks) {
      try {
        await mongoVectorService.guardarChunk({
          content: chunk.contenido,
          category: chunk.categoria,
          section: chunk.section,
          fileName: chunk.fileName,
          source: 'pdf',
          embedding: []
        });
        guardados++;
      } catch (e) {
        console.warn('⚠️ Error guardando chunk:', e.message);
      }
    }

    await this.editarMensaje(chatId, mensajeId, '✅ Listo.');
    await this.bot.sendMessage(chatId,
      `✅ *"${fileName}" cargado correctamente*\n\n` +
      `📊 Se guardaron *${guardados} secciones* en la base de conocimiento.\n\n` +
      `🤖 *Ya puedes preguntarme lo que necesites.*\n\n` +
      `Por ejemplo:\n` +
      `• ¿Cuál es la tasa de interés?\n` +
      `• ¿Cuántos estados tiene un crédito?\n` +
      `• ¿Cómo se registra un cliente?\n` +
      `• ¿Qué es TuCobrador?`,
      { parse_mode: 'Markdown' }
    );
    console.log(`✅ "${fileName}" indexado: ${guardados} chunks`);
  }

  // ──────────────────────────────────────────────────────────
  // PREGUNTAS ESCRITAS EN EL CHAT
  // ──────────────────────────────────────────────────────────

  // Maneja preguntas de texto escritas directamente en el chat.
  // Primero intenta con datos de MongoDB; si no aplica, busca en PDFs indexados.
  async handlePregunta(msg) {
    if (!this.bot) return;
    const chatId = msg.chat.id;
    const pregunta = msg.text;

    const indicador = await this.bot.sendMessage(chatId, '🔍 Buscando en la base de conocimiento...');
    console.log(`\n📱 Pregunta: "${pregunta}"`);

    try {
      let respuesta = null;

      // PASO 1: Buscar en los PDFs indexados en MongoDB
      const chunks = await mongoVectorService.buscarPorTexto(pregunta, 5);
      console.log(`📚 Chunks encontrados: ${chunks.length}`);

      if (chunks.length > 0) {
        await this.editarMensaje(chatId, indicador.message_id, '🤖 Consultando IA...');
        const prompt =
          `Eres el asistente inteligente del sistema de cobranza TuCobrador.\n\n` +
          `Usa la siguiente información de la base de conocimiento para responder:\n\n` +
          `${chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}\n\n` +
          `PREGUNTA: ${pregunta}\n\n` +
          `Responde de forma clara, directa y en español. ` +
          `Si la respuesta está en la información, respóndela con exactitud. ` +
          `Si no está, dilo claramente.`;

        try {
          respuesta = await claudeService.generarRespuestaSimple(prompt);
        } catch {
          respuesta = chunks.map(c => c.content).join('\n\n');
        }
      }

      // PASO 2: Si no hay chunks, consultar datos del sistema en tiempo real
      if (!respuesta) {
        console.log('📊 Buscando en datos del sistema...');
        const datosBD = await consultarBD(pregunta);

        if (datosBD && Object.keys(datosBD).length > 0) {
          const contextoBD = construirContextoBD(datosBD);
          const prompt =
            `Eres el asistente del sistema de cobranza TuCobrador.\n\n` +
            `Datos actuales del sistema:\n${contextoBD}\n\n` +
            `PREGUNTA: ${pregunta}\n\n` +
            `Responde de forma natural y concisa con los datos exactos.`;
          try {
            respuesta = await claudeService.generarRespuestaSimple(prompt);
          } catch {
            respuesta = contextoBD;
          }
        }
      }

      // PASO 3: Sin información disponible
      if (!respuesta) {
        await this.editarMensaje(chatId, indicador.message_id,
          '🤷 No encontré información sobre eso.\n\n' +
          '💡 Primero envíame un PDF con el tema que quieres consultar.'
        );
        return;
      }

      await this.editarMensaje(chatId, indicador.message_id, respuesta);
      console.log('✅ Respuesta enviada');

    } catch (error) {
      console.error('❌ Error:', error.message);
      await this.editarMensaje(chatId, indicador.message_id, `❌ Error: ${error.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────
  // FUNCIONES DE UTILIDAD
  // ──────────────────────────────────────────────────────────

  // Descarga un archivo de Telegram y lo guarda en disco local
  async descargarArchivo(fileId, destPath) {
    const fileInfo = await this.bot.getFile(fileId);
    const fileUrl  = `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`;

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      https.get(fileUrl, (res) => {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  // Edita un mensaje existente en lugar de enviar uno nuevo.
  // Así el chat no se llena de mensajes y el usuario ve el progreso en uno solo.
  async editarMensaje(chatId, mensajeId, texto, parseMode = null) {
    const opts = { chat_id: chatId, message_id: mensajeId };
    if (parseMode) opts.parse_mode = parseMode;
    try {
      await this.bot.editMessageText(texto, opts);
    } catch {
      // Telegram lanza error si el texto nuevo es igual al anterior — ignorar
    }
  }

  // Divide un texto largo en partes de máximo `limite` caracteres.
  // Telegram tiene un límite de 4096 chars por mensaje.
  // Intenta cortar en saltos de línea para no partir oraciones.
  dividirMensajeLargo(texto, limite = 3500) {
    if (texto.length <= limite) return [texto];

    const partes = [];
    let inicio = 0;

    while (inicio < texto.length) {
      let fin = Math.min(inicio + limite, texto.length);
      // Buscar el último salto de línea antes del límite para cortar limpio
      if (fin < texto.length) {
        const ultimoSalto = texto.lastIndexOf('\n', fin);
        if (ultimoSalto > inicio + 200) fin = ultimoSalto;
      }
      partes.push(texto.substring(inicio, fin).trim());
      inicio = fin;
    }

    return partes;
  }

  // Envía un mensaje de prueba (usado desde el endpoint REST /api/telegram/test-message)
  async enviarMensajePrueba(chatId, texto) {
    try {
      await this.bot.sendMessage(chatId, texto);
    } catch (error) {
      console.error('❌ Error enviando mensaje de prueba:', error.message);
    }
  }
}

module.exports = TelegramRAGService;
