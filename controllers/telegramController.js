const TelegramService = require('../services/telegramService');
const axios = require('axios');

/**
 * Recibe el webhook de Telegram
 */
exports.webhook = async (req, res) => {
  try {
    console.log('📨 Webhook recibido de Telegram');
    
    const update = req.body;

    // Procesar el mensaje
    if (update.message) {
      await TelegramService.procesarWebhook(update);
    }

    // Responder inmediatamente a Telegram (200 OK)
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ Error en webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Configura el webhook en Telegram
 * POST /api/telegram/setup-webhook?url=https://tudominio.com
 */
exports.configurarWebhook = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL del webhook no proporcionada' });
    }

    if (!process.env.TELEGRAM_TOKEN) {
      return res.status(400).json({ error: 'TELEGRAM_TOKEN no está configurado' });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/setWebhook`;

    const response = await axios.post(telegramApiUrl, {
      url: url,
      allowed_updates: ['message']
    });

    if (response.data.ok) {
      res.json({
        success: true,
        mensaje: 'Webhook configurado exitosamente',
        url: url,
        resultado: response.data.result
      });
      console.log('✅ Webhook configurado:', url);
    } else {
      res.status(400).json({
        error: 'Error al configurar webhook',
        detalle: response.data
      });
    }
  } catch (error) {
    console.error('❌ Error configurando webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtiene información del webhook actual
 * GET /api/telegram/webhook-info
 */
exports.obtenerInfoWebhook = async (req, res) => {
  try {
    if (!process.env.TELEGRAM_TOKEN) {
      return res.status(400).json({ error: 'TELEGRAM_TOKEN no está configurado' });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getWebhookInfo`;

    const response = await axios.get(telegramApiUrl);

    res.json(response.data);
    console.log('✅ Info del webhook obtenida');
  } catch (error) {
    console.error('❌ Error obteniendo info del webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Elimina el webhook
 * DELETE /api/telegram/delete-webhook
 */
exports.eliminarWebhook = async (req, res) => {
  try {
    if (!process.env.TELEGRAM_TOKEN) {
      return res.status(400).json({ error: 'TELEGRAM_TOKEN no está configurado' });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`;

    const response = await axios.post(telegramApiUrl);

    if (response.data.ok) {
      res.json({
        success: true,
        mensaje: 'Webhook eliminado exitosamente'
      });
      console.log('✅ Webhook eliminado');
    } else {
      res.status(400).json({
        error: 'Error al eliminar webhook',
        detalle: response.data
      });
    }
  } catch (error) {
    console.error('❌ Error eliminando webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Envía un mensaje de prueba a Telegram
 * POST /api/telegram/test-message
 */
exports.enviarMensajePrueba = async (req, res) => {
  try {
    const { chatId, mensaje } = req.body;

    if (!chatId || !mensaje) {
      return res.status(400).json({ error: 'chatId y mensaje son requeridos' });
    }

    await TelegramService.enviarMensaje(chatId, mensaje);

    res.json({
      success: true,
      mensaje: 'Mensaje enviado exitosamente',
      chatId: chatId
    });
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtiene la información del bot
 * GET /api/telegram/bot-info
 */
exports.obtenerInfoBot = async (req, res) => {
  try {
    if (!process.env.TELEGRAM_TOKEN) {
      return res.status(400).json({ error: 'TELEGRAM_TOKEN no está configurado' });
    }

    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getMe`;

    const response = await axios.get(telegramApiUrl);

    res.json(response.data);
    console.log('✅ Info del bot obtenida');
  } catch (error) {
    console.error('❌ Error obteniendo info del bot:', error.message);
    res.status(500).json({ error: error.message });
  }
};
