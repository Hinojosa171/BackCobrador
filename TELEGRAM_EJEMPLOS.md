# 🧪 Ejemplos de Prueba - API Telegram del Cobrador

## IMPORTANTE: Reemplaza estos valores:
- `YOUR_TOKEN_HERE` → Tu token de Telegram
- `YOUR_WEBHOOK_URL` → Tu URL de webhook (ngrok o dominio)
- `YOUR_CHAT_ID` → Tu ID de chat de Telegram (lo verás cuando el bot te envíe un mensaje)

---

## 1️⃣ OBTENER INFO DEL BOT

```bash
curl -X GET http://localhost:3000/api/telegram/bot-info
```

**Respuesta:**
```json
{
  "ok": true,
  "result": {
    "id": 1234567890,
    "is_bot": true,
    "first_name": "Tu Cobrador Bot",
    "username": "tu_cobrador_bot",
    "can_join_groups": true,
    "can_read_all_group_messages": false,
    "supports_inline_queries": false
  }
}
```

---

## 2️⃣ CONFIGURAR WEBHOOK

### Opción A: Para producción con ngrok

```bash
curl -X POST "http://localhost:3000/api/telegram/setup-webhook?url=https://abc123.ngrok.io/api/telegram/webhook"
```

### Opción B: Para tu servidor remoto

```bash
curl -X POST "http://localhost:3000/api/telegram/setup-webhook?url=https://tudominio.com/api/telegram/webhook"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "mensaje": "Webhook configurado exitosamente",
  "url": "https://abc123.ngrok.io/api/telegram/webhook",
  "resultado": {
    "ok": true,
    "result": true
  }
}
```

---

## 3️⃣ OBTENER INFORMACIÓN DEL WEBHOOK

```bash
curl -X GET http://localhost:3000/api/telegram/webhook-info
```

**Respuesta:**
```json
{
  "ok": true,
  "result": {
    "url": "https://abc123.ngrok.io/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "1.2.3.4",
    "last_error_date": 0,
    "max_connections": 40,
    "allowed_updates": ["message"]
  }
}
```

---

## 4️⃣ ENVIAR MENSAJE DE PRUEBA

**Reemplaza `YOUR_CHAT_ID` con tu ID de chat**

```bash
curl -X POST http://localhost:3000/api/telegram/test-message \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": YOUR_CHAT_ID,
    "mensaje": "🤖 <b>Hola!</b> Soy el bot Tu Cobrador.\n\nEscribe /help para ver el menú."
  }'
```

**Ejemplo con ID real:**

```bash
curl -X POST http://localhost:3000/api/telegram/test-message \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 987654321,
    "mensaje": "🤖 <b>Hola!</b> Soy el bot Tu Cobrador.\n\nEscribe /help para ver el menú."
  }'
```

---

## 5️⃣ SIMULAR WEBHOOK (Prueba local)

Simula que Telegram te envía un mensaje:

```bash
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "chat": {
        "id": 987654321
      },
      "from": {
        "id": 987654321,
        "first_name": "Juan"
      },
      "text": "Juan Pérez|3155555555|1234567890|Calle 5 #10"
    }
  }'
```

**El bot creará un cliente automáticamente.**

---

## 🧠 CÓMO OBTENER TU CHAT_ID

1. Abre tu bot: `https://t.me/tu_cobrador_bot`
2. Escribe `/start`
3. Mira los logs del backend
4. Verás algo como:

```
📱 Mensaje de Telegram: "/start" (Usuario: Juan, Chat: 987654321)
```

Ese número es tu `CHAT_ID`.

---

## 📱 FLUJO COMPLETO DE PRUEBA

### Paso 1: Iniciar el servidor

```bash
cd CobradorBankend
npm start
```

### Paso 2: Iniciar ngrok

```bash
ngrok http 3000
```

### Paso 3: Configurar webhook

```bash
curl -X POST "http://localhost:3000/api/telegram/setup-webhook?url=https://abc123.ngrok.io/api/telegram/webhook"
```

### Paso 4: Abre tu bot en Telegram

`https://t.me/tu_cobrador_bot`

### Paso 5: Envía un mensaje

```
Juan Pérez|3155555555|1234567890|Calle 5 #10
```

### Paso 6: Verifica en los logs

```
✅ Cliente creado desde Telegram: Juan Pérez
```

---

## 🐛 TROUBLESHOOTING

### Si no recibe mensajes:

```bash
# Verificar webhook
curl -X GET http://localhost:3000/api/telegram/webhook-info

# Ver si hay errores
curl -X GET http://localhost:3000/api/telegram/bot-info
```

### Si el webhook no se configura:

```bash
# Eliminar webhook anterior
curl -X DELETE http://localhost:3000/api/telegram/delete-webhook

# Configurar de nuevo
curl -X POST "http://localhost:3000/api/telegram/setup-webhook?url=https://abc123.ngrok.io/api/telegram/webhook"
```

---

## 📚 REFERENCIAS

- Documentación oficial de Telegram Bot API: https://core.telegram.org/bots/api
- ngrok (para exponer servidor local): https://ngrok.com
- Postman (alternativa a curl): https://postman.com

---

¡Listo para probar! 🚀
