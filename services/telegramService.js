const axios = require('axios');
const Cliente = require('../models/Cliente');
const Credito = require('../models/Credito');
const Pago = require('../models/Pago');
const ConversationState = require('../models/ConversationState');
const Cobrador = require('../models/Cobrador');

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

class TelegramService {
  /**
   * Envía un mensaje a Telegram con botones
   */
  static async enviarMensaje(chatId, mensaje, botones = null) {
    try {
      const payload = {
        chat_id: chatId,
        text: mensaje,
        parse_mode: 'HTML'
      };

      // Agregar botones si existen
      if (botones) {
        payload.reply_markup = {
          inline_keyboard: botones
        };
      }

      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, payload);
      console.log('✅ Mensaje enviado a Telegram:', chatId);
      return response.data;
    } catch (error) {
      console.error('❌ Error al enviar mensaje a Telegram:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene o crea el estado de conversación
   */
  static async obtenerEstado(chatId, userId) {
    let estado = await ConversationState.findOne({ chatId });
    
    if (!estado) {
      // Solo crear y enviar mensaje si es la PRIMERA VEZ
      estado = new ConversationState({
        chatId,
        userId,
        estado: 'autenticar_cedula'
      });
      await estado.save();
      
      // Enviar solo una vez: cuando se crea el estado
      await this.enviarMensaje(chatId, 
        '🔐 <b>Bienvenido a Tu Cobrador Bot</b>\n\n' +
        'Por favor ingresa tu <b>CÉDULA</b> para autenticarte.\n' +
        '(La cédula registrada en el sistema)'
      );
    }
    
    return estado;
  }

  /**
   * Actualiza el estado de conversación
   */
  static async actualizarEstado(chatId, nuevoEstado, datosTemporales = {}) {
    const estado = await ConversationState.findOneAndUpdate(
      { chatId },
      {
        estado: nuevoEstado,
        datosTemporales: {
          ...datosTemporales
        },
        ultimaInteraccion: new Date()
      },
      { new: true }
    );
    return estado;
  }

  /**
   * Procesa el webhook de Telegram con callback_query (botones)
   */
  static async procesarWebhook(data) {
    try {
      // Procesar mensaje de texto
      if (data.message) {
        await this.procesarMensaje(data.message);
      }
      
      // Procesar clicks en botones
      if (data.callback_query) {
        await this.procesarCallbackQuery(data.callback_query);
      }
    } catch (error) {
      console.error('❌ Error procesando webhook:', error.message);
    }
  }

  /**
   * Procesa un mensaje de texto
   */
  static async procesarMensaje(mensaje) {
    try {
      const chatId = mensaje.chat.id;
      const texto = mensaje.text;
      const userId = mensaje.from.id;
      const nombreUsuario = mensaje.from.first_name;

      console.log(`📱 Mensaje: "${texto}" (Usuario: ${nombreUsuario}, Chat: ${chatId})`);

      const estado = await this.obtenerEstado(chatId, userId);

      // Comandos especiales
      if (texto.startsWith('/')) {
        await this.procesarComando(chatId, texto, estado);
        return;
      }

      // Procesar según el estado actual
      switch (estado.estado) {
        case 'autenticar_cedula':
          await this.procesarAutenticacionCedula(chatId, texto, estado);
          break;

        case 'crear_cliente_nombre':
          await this.procesarNombreCliente(chatId, texto, estado);
          break;
        
        case 'crear_cliente_telefono':
          await this.procesarTelefonoCliente(chatId, texto, estado);
          break;
        
        case 'crear_cliente_cedula':
          await this.procesarCedulaCliente(chatId, texto, estado);
          break;
        
        case 'crear_cliente_direccion':
          await this.procesarDireccionCliente(chatId, texto, estado);
          break;
        
        case 'crear_credito_telefono':
          await this.procesarTelefonoCredito(chatId, texto, estado);
          break;
        
        case 'crear_credito_monto':
          await this.procesarMontoCredito(chatId, texto, estado);
          break;
        
        case 'pagar_telefono':
          await this.procesarTelefonoPago(chatId, texto, estado);
          break;
        
        case 'pagar_monto':
          await this.procesarMontoPago(chatId, texto, estado);
          break;
        
        case 'consultar_telefono':
          await this.procesarTelefonoConsulta(chatId, texto, estado);
          break;
        
        case 'menu':
          // Cuando el usuario está en menú y envía texto, interpretar como acción
          const textoLower = texto.toLowerCase();
          
          if (textoLower.includes('crear') && textoLower.includes('cliente')) {
            await this.actualizarEstado(chatId, 'crear_cliente_nombre');
            await this.enviarMensaje(chatId, '📝 <b>Crear Cliente</b>\n\n¿Cuál es el <b>nombre</b> del cliente?');
          } else if (textoLower.includes('crear') && textoLower.includes('crédito')) {
            await this.actualizarEstado(chatId, 'crear_credito_telefono');
            await this.enviarMensaje(chatId, '💰 <b>Crear Crédito</b>\n\n¿Cuál es el <b>teléfono</b> del cliente?');
          } else if (textoLower.includes('consultar')) {
            await this.actualizarEstado(chatId, 'consultar_telefono');
            await this.enviarMensaje(chatId, '🔍 <b>Consultar Cliente</b>\n\n¿Cuál es el <b>teléfono</b> del cliente?');
          } else if (textoLower.includes('pagar') || textoLower.includes('registrar')) {
            await this.actualizarEstado(chatId, 'pagar_telefono');
            await this.enviarMensaje(chatId, '💳 <b>Registrar Pago</b>\n\n¿Cuál es el <b>teléfono</b> del cliente?');
          } else {
            await this.mostrarMenuPrincipal(chatId);
          }
          break;
        
        default:
          await this.mostrarMenuPrincipal(chatId);
      }
    } catch (error) {
      console.error('❌ Error en procesarMensaje:', error.message);
    }
  }

  /**
   * Procesa clicks en botones (callback_query)
   */
  static async procesarCallbackQuery(callbackQuery) {
    try {
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const accion = callbackQuery.data;

      console.log(`🔘 Botón presionado: ${accion} (Chat: ${chatId})`);

      const estado = await this.obtenerEstado(chatId, userId);

      // Responder al callback para que Telegram cierre el loading
      await axios.post(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
        callback_query_id: callbackQuery.id,
        text: '⏳ Procesando...'
      });

      // Ejecutar la acción según el botón presionado
      switch (accion) {
        case 'menu_principal':
          await this.mostrarMenuPrincipal(chatId);
          break;
        
        case 'crear_cliente':
          await this.actualizarEstado(chatId, 'crear_cliente_nombre');
          await this.enviarMensaje(chatId, '📝 <b>Crear Cliente</b>\n\n¿Cuál es el <b>nombre</b> del cliente?');
          break;
        
        case 'crear_credito':
          await this.actualizarEstado(chatId, 'crear_credito_telefono');
          await this.enviarMensaje(chatId, '💰 <b>Crear Crédito</b>\n\n¿Cuál es el <b>teléfono</b> del cliente?');
          break;
        
        case 'consultar_cliente':
          await this.actualizarEstado(chatId, 'consultar_telefono');
          await this.enviarMensaje(chatId, '🔍 <b>Consultar Cliente</b>\n\n¿Cuál es el <b>teléfono</b> del cliente?');
          break;
        
        case 'registrar_pago':
          await this.actualizarEstado(chatId, 'pagar_telefono');
          await this.enviarMensaje(chatId, '💳 <b>Registrar Pago</b>\n\n¿Cuál es el <b>teléfono</b> del cliente?');
          break;
        
        default:
          console.log('❌ Acción desconocida:', accion);
      }
    } catch (error) {
      console.error('❌ Error en procesarCallbackQuery:', error.message);
    }
  }

  /**
   * Procesa comandos especiales
   */
  static async procesarComando(chatId, comando, estado) {
    const cmd = comando.toLowerCase().split(' ')[0];

    switch (cmd) {
      case '/start':
        // Solo mostrar menú si está autenticado
        if (estado.cobradorID) {
          await this.mostrarMenuPrincipal(chatId);
        }
        // Si no está autenticado, simplemente ignorar (ya tiene el mensaje de cédula)
        break;
      
      case '/help':
      case '/menu':
        if (estado.cobradorID) {
          await this.mostrarMenuPrincipal(chatId);
        } else {
          await this.enviarMensaje(chatId, '🔐 Primero debes autenticarte ingresando tu cédula.');
        }
        break;
      
      default:
        await this.enviarMensaje(chatId, 
          '❌ Comando no reconocido.\n\n' +
          'Usa <code>/start</code> para ver el menú principal.'
        );
    }
  }

  /**
   * Muestra el menú principal con botones
   */
  static async mostrarMenuPrincipal(chatId) {
    const botones = [
      [
        { text: '📝 Crear Cliente', callback_data: 'crear_cliente' },
        { text: '💰 Crear Crédito', callback_data: 'crear_credito' }
      ],
      [
        { text: '🔍 Consultar Cliente', callback_data: 'consultar_cliente' },
        { text: '💳 Registrar Pago', callback_data: 'registrar_pago' }
      ]
    ];

    const mensaje = 
      '🤖 <b>Tu Cobrador Bot</b>\n\n' +
      '¿Qué deseas hacer?\n\n' +
      '• <b>📝 Crear Cliente:</b> Registra nuevos clientes\n' +
      '• <b>💰 Crear Crédito:</b> Abre un crédito para un cliente\n' +
      '• <b>🔍 Consultar:</b> Ve info del cliente\n' +
      '• <b>💳 Pagar:</b> Registra un pago de deuda';

    await this.actualizarEstado(chatId, 'menu');
    await this.enviarMensaje(chatId, mensaje, botones);
  }

  // ============================================
  // PROCESAR AUTENTICACIÓN
  // ============================================

  static async procesarAutenticacionCedula(chatId, texto, estado) {
    try {
      const cedula = texto.trim();

      // Buscar cobrador con esa cédula
      const cobrador = await Cobrador.findOne({ cedula: cedula, activo: true });

      if (!cobrador) {
        await this.enviarMensaje(chatId, 
          '❌ <b>Cédula no encontrada</b>\n\n' +
          'No hay un cobrador activo con esa cédula.\n' +
          'Por favor ingresa tu cédula nuevamente.'
        );
        return;
      }

      // Actualizar estado con el cobradorID
      await ConversationState.findOneAndUpdate(
        { chatId },
        {
          cobradorID: cobrador._id,
          cedulaCobrador: cedula,
          estado: 'menu',
          datosTemporales: {
            cobradorNombre: cobrador.nombre,
            cobradorID: cobrador._id
          }
        },
        { new: true }
      );

      // Mostrar menú principal
      const botones = [
        [
          { text: '📝 Crear Cliente', callback_data: 'crear_cliente' },
          { text: '💰 Crear Crédito', callback_data: 'crear_credito' }
        ],
        [
          { text: '🔍 Consultar Cliente', callback_data: 'consultar_cliente' },
          { text: '💳 Registrar Pago', callback_data: 'registrar_pago' }
        ]
      ];

      const mensaje = 
        '✅ <b>¡Autenticación exitosa!</b>\n\n' +
        '👤 Bienvenido <b>' + cobrador.nombre + '</b>\n' +
        '📍 Cédula: ' + cedula + '\n\n' +
        '🤖 <b>Tu Cobrador Bot</b>\n' +
        '¿Qué deseas hacer?';

      await this.enviarMensaje(chatId, mensaje, botones);
      console.log(`✅ Cobrador autenticado: ${cobrador.nombre} (${cedula})`);
    } catch (error) {
      console.error('❌ Error en autenticación:', error.message);
      await this.enviarMensaje(chatId, '❌ Error: ' + error.message);
    }
  }

  // ============================================
  // PROCESAR FLUJO: CREAR CLIENTE
  // ============================================

  static async procesarNombreCliente(chatId, texto, estado) {
    await this.actualizarEstado(chatId, 'crear_cliente_telefono', {
      tipo: 'cliente',
      nombre: texto.trim()
    });
    await this.enviarMensaje(chatId, '✅ Nombre guardado: <b>' + texto + '</b>\n\n¿Cuál es el <b>teléfono</b>? (ej: 3155555555)');
  }

  static async procesarTelefonoCliente(chatId, texto, estado) {
    const telefono = texto.trim();
    
    // Validar formato
    if (!/^\d{7,}$/.test(telefono)) {
      await this.enviarMensaje(chatId, '❌ Teléfono inválido. Por favor ingresa solo números (mínimo 7 dígitos)');
      return;
    }

    // Verificar si existe EN EL MISMO COBRADOR
    const existe = await Cliente.findOne({ 
      telefono,
      cobradorID: estado.cobradorID 
    });
    if (existe) {
      await this.enviarMensaje(chatId, '⚠️ Ya existe un cliente con este teléfono. Intenta con otro.');
      return;
    }

    await this.actualizarEstado(chatId, 'crear_cliente_cedula', {
      tipo: 'cliente',
      nombre: estado.datosTemporales.nombre,
      telefono: telefono
    });
    await this.enviarMensaje(chatId, '✅ Teléfono guardado: <b>' + telefono + '</b>\n\n¿Cuál es la <b>cédula</b>? (ej: 1234567890)');
  }

  static async procesarCedulaCliente(chatId, texto, estado) {
    await this.actualizarEstado(chatId, 'crear_cliente_direccion', {
      tipo: 'cliente',
      nombre: estado.datosTemporales.nombre,
      telefono: estado.datosTemporales.telefono,
      cedula: texto.trim()
    });
    await this.enviarMensaje(chatId, '✅ Cédula guardada: <b>' + texto + '</b>\n\n¿Cuál es la <b>dirección</b>? (ej: Calle 5 #10)');
  }

  static async procesarDireccionCliente(chatId, texto, estado) {
    try {
      const { nombre, telefono, cedula } = estado.datosTemporales;

      const nuevoCliente = new Cliente({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        cedula: cedula.trim(),
        direccion: texto.trim(),
        estado: 'activo',
        telegramID: chatId,
        cobradorID: estado.cobradorID
      });

      await nuevoCliente.save();

      await this.actualizarEstado(chatId, 'menu');

      const botones = [
        [
          { text: '➕ Crear otro cliente', callback_data: 'crear_cliente' },
          { text: '📋 Menú Principal', callback_data: 'menu_principal' }
        ]
      ];

      await this.enviarMensaje(chatId,
        '✅ <b>Cliente creado exitosamente!</b>\n\n' +
        '<b>Nombre:</b> ' + nombre + '\n' +
        '<b>Teléfono:</b> ' + telefono + '\n' +
        '<b>Cédula:</b> ' + cedula + '\n' +
        '<b>Dirección:</b> ' + texto.trim(),
        botones
      );

      console.log(`✅ Cliente creado desde Telegram: ${nombre}`);
    } catch (error) {
      console.error('❌ Error creando cliente:', error.message);
      await this.enviarMensaje(chatId, '❌ Error: ' + error.message);
      await this.mostrarMenuPrincipal(chatId);
    }
  }

  // ============================================
  // PROCESAR FLUJO: CREAR CRÉDITO
  // ============================================

  static async procesarTelefonoCredito(chatId, texto, estado) {
    const telefono = texto.trim();
    
    const cliente = await Cliente.findOne({ 
      telefono,
      cobradorID: estado.cobradorID 
    });
    console.log(`🔍 Buscando cliente del cobrador con teléfono: ${telefono}, Encontrado:`, cliente ? 'SÍ' : 'NO');
    
    if (!cliente) {
      await this.enviarMensaje(chatId, '❌ Cliente no encontrado con teléfono: ' + telefono);
      return;
    }

    console.log(`✅ Cliente encontrado: ${cliente.nombre}, ID: ${cliente._id}`);

    await this.actualizarEstado(chatId, 'crear_credito_monto', {
      tipo: 'credito',
      clienteID: cliente._id,
      telefono: telefono,
      nombreCliente: cliente.nombre
    });

    await this.enviarMensaje(chatId,
      '✅ Cliente encontrado: <b>' + cliente.nombre + '</b>\n\n' +
      '¿Cuál es el <b>monto</b> del crédito? (ej: 50000)'
    );
  }

  static async procesarMontoCredito(chatId, texto, estado) {
    try {
      const monto = parseFloat(texto.trim());
      
      if (isNaN(monto) || monto <= 0) {
        await this.enviarMensaje(chatId, '❌ Monto inválido. Por favor ingresa un número válido.');
        return;
      }

      console.log(`📊 Datos temporales:`, estado.datosTemporales);
      const { clienteID, nombreCliente } = estado.datosTemporales;
      
      console.log(`💳 Creando crédito - clienteID: ${clienteID}, monto: ${monto}, nombre: ${nombreCliente}`);
      
      const tasaInteres = 0.30; // 30% fijo

      const nuevoCredito = new Credito({
        clienteID: clienteID,
        cobradorID: estado.cobradorID,
        montoBase: monto,
        tasaInteres: tasaInteres
      });

      await nuevoCredito.save();

      const interes = nuevoCredito.interes;
      const montoTotal = nuevoCredito.montoTotal;

      await this.actualizarEstado(chatId, 'menu');

      const botones = [
        [
          { text: '➕ Crear otro crédito', callback_data: 'crear_credito' },
          { text: '📋 Menú Principal', callback_data: 'menu_principal' }
        ]
      ];

      await this.enviarMensaje(chatId,
        '✅ <b>Crédito creado exitosamente!</b>\n\n' +
        '<b>Cliente:</b> ' + nombreCliente + '\n' +
        '<b>Monto Base:</b> $' + monto.toLocaleString() + '\n' +
        '<b>Tasa:</b> 30%\n' +
        '<b>Interés:</b> $' + interes.toLocaleString() + '\n' +
        '<b>Total a pagar:</b> $' + montoTotal.toLocaleString() + '\n' +
        '<b>Estado:</b> Pendiente',
        botones
      );

      console.log(`✅ Crédito creado desde Telegram para ${nombreCliente}: $${monto}`);
    } catch (error) {
      console.error('❌ Error creando crédito:', error.message);
      await this.enviarMensaje(chatId, '❌ Error: ' + error.message);
      await this.mostrarMenuPrincipal(chatId);
    }
  }

  // ============================================
  // PROCESAR FLUJO: CONSULTAR CLIENTE
  // ============================================

  static async procesarTelefonoConsulta(chatId, texto, estado) {
    try {
      const telefono = texto.trim();
      
      const cliente = await Cliente.findOne({ telefono });
      
      if (!cliente) {
        await this.enviarMensaje(chatId, '❌ Cliente no encontrado con teléfono: ' + telefono);
        return;
      }

      const creditos = await Credito.find({ clienteID: cliente._id });
      
      let mensaje = '👤 <b>Información del Cliente</b>\n\n' +
        '<b>Nombre:</b> ' + cliente.nombre + '\n' +
        '<b>Teléfono:</b> <code>' + cliente.telefono + '</code>\n' +
        '<b>Cédula:</b> ' + cliente.cedula + '\n' +
        '<b>Dirección:</b> ' + cliente.direccion + '\n' +
        '<b>Estado:</b> ' + cliente.estado + '\n\n';

      if (creditos.length === 0) {
        mensaje += '💬 Este cliente no tiene créditos registrados.';
      } else {
        mensaje += '<b>Créditos (' + creditos.length + '):</b>\n';
        creditos.forEach((credito, i) => {
          mensaje += '\n<b>' + (i + 1) + '. Crédito:</b>\n' +
            '   💰 Monto: $' + credito.montoBase.toLocaleString() + '\n' +
            '   📊 Total a pagar: $' + credito.montoTotal.toLocaleString() + '\n' +
            '   📈 Estado: ' + credito.estado + '\n' +
            '   📅 Fecha: ' + new Date(credito.fechaCreacion).toLocaleDateString();
        });
      }

      await this.actualizarEstado(chatId, 'menu');

      const botones = [
        [
          { text: '🔍 Consultar otro', callback_data: 'consultar_cliente' },
          { text: '📋 Menú Principal', callback_data: 'menu_principal' }
        ]
      ];

      await this.enviarMensaje(chatId, mensaje, botones);
    } catch (error) {
      console.error('❌ Error consultando cliente:', error.message);
      await this.enviarMensaje(chatId, '❌ Error: ' + error.message);
      await this.mostrarMenuPrincipal(chatId);
    }
  }

  // ============================================
  // PROCESAR FLUJO: REGISTRAR PAGO
  // ============================================

  static async procesarTelefonoPago(chatId, texto, estado) {
    const telefono = texto.trim();
    
    const cliente = await Cliente.findOne({ 
      telefono,
      cobradorID: estado.cobradorID 
    });
    console.log(`🔍 Buscando cliente del cobrador con teléfono: ${telefono}, Encontrado:`, cliente ? 'SÍ' : 'NO');
    
    if (!cliente) {
      await this.enviarMensaje(chatId, '❌ Cliente no encontrado con teléfono: ' + telefono);
      return;
    }

    const credito = await Credito.findOne({ 
      clienteID: cliente._id,
      cobradorID: estado.cobradorID,
      estado: { $in: ['Pendiente', 'Vencido'] } 
    });
    
    if (!credito) {
      await this.enviarMensaje(chatId, '❌ ' + cliente.nombre + ' no tiene créditos pendientes.');
      return;
    }

    console.log(`✅ Cliente encontrado: ${cliente.nombre}, Crédito ID: ${credito._id}`);

    const montoPagado = credito.montoPagado || 0;
    const montoRestante = credito.montoTotal - montoPagado;

    await this.actualizarEstado(chatId, 'pagar_monto', {
      tipo: 'pago',
      clienteID: cliente._id,
      creditoID: credito._id,
      telefono: telefono,
      nombreCliente: cliente.nombre,
      montoRestante: montoRestante
    });

    await this.enviarMensaje(chatId,
      '✅ Cliente encontrado: <b>' + cliente.nombre + '</b>\n\n' +
      '<b>Crédito activo:</b>\n' +
      '  Monto original: $' + credito.montoBase.toLocaleString() + '\n' +
      '  Total a pagar: $' + credito.montoTotal.toLocaleString() + '\n' +
      '  Pagado: $' + montoPagado.toLocaleString() + '\n' +
      '  Restante: $' + montoRestante.toLocaleString() + '\n\n' +
      '¿Cuánto deseas pagar? (ej: 5000)'
    );
  }

  static async procesarMontoPago(chatId, texto, estado) {
    try {
      const montoPago = parseFloat(texto.trim());
      
      if (isNaN(montoPago) || montoPago <= 0) {
        await this.enviarMensaje(chatId, '❌ Monto inválido. Por favor ingresa un número válido.');
        return;
      }

      const montoRestante = estado.datosTemporales.montoRestante || 0;
      
      if (montoPago > montoRestante) {
        await this.enviarMensaje(chatId, 
          '⚠️ El monto excede lo adeudado ($' + montoRestante.toLocaleString() + ').\n' +
          'Por favor ingresa un monto menor.'
        );
        return;
      }

      console.log(`📊 Datos temporales:`, estado.datosTemporales);
      const { creditoID, clienteID, nombreCliente } = estado.datosTemporales;
      
      console.log(`💳 Registrando pago - creditoID: ${creditoID}, clienteID: ${clienteID}, monto: ${montoPago}`);

      const nuevoPago = new Pago({
        creditoID: creditoID,
        clienteID: clienteID,
        cobradorID: estado.cobradorID,
        monto: montoPago,
        fecha: new Date(),
        telegramID: chatId
      });

      await nuevoPago.save();

      // Actualizar crédito
      const credito = await Credito.findById(creditoID);
      credito.montoPagado = (credito.montoPagado || 0) + montoPago;
      
      const nuevoRestante = credito.montoTotal - credito.montoPagado;

      if (nuevoRestante <= 0) {
        credito.estado = 'Pagado';
      }

      await credito.save();

      await this.actualizarEstado(chatId, 'menu');

      const botones = [
        [
          { text: '💳 Registrar otro pago', callback_data: 'registrar_pago' },
          { text: '📋 Menú Principal', callback_data: 'menu_principal' }
        ]
      ];

      await this.enviarMensaje(chatId,
        '✅ <b>Pago registrado exitosamente!</b>\n\n' +
        '<b>Cliente:</b> ' + nombreCliente + '\n' +
        '<b>Monto pagado:</b> $' + montoPago.toLocaleString() + '\n' +
        '<b>Total pagado:</b> $' + credito.montoPagado.toLocaleString() + '\n' +
        '<b>Restante:</b> $' + Math.max(0, nuevoRestante).toLocaleString() + '\n' +
        '<b>Estado crédito:</b> ' + credito.estado,
        botones
      );

      console.log(`✅ Pago registrado desde Telegram para ${nombreCliente}: $${montoPago}`);
    } catch (error) {
      console.error('❌ Error registrando pago:', error.message);
      await this.enviarMensaje(chatId, '❌ Error: ' + error.message);
      await this.mostrarMenuPrincipal(chatId);
    }
  }
}

module.exports = TelegramService;
