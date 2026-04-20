# 🤖 Guía de Integración con Telegram Bot - Tu Cobrador

---

## 📋 Tabla de Contenidos
1. [Crear el Bot en Telegram](#crear-el-bot)
2. [Configurar Variables de Entorno](#configurar-env)
3. [Instalar Dependencias](#instalar-dependencias)
4. [Configurar el Webhook](#configurar-webhook)
5. [Usar el Bot](#usar-el-bot)
6. [Solucionar Problemas](#solucionar-problemas)

---

## 1. Crear el Bot en Telegram {#crear-el-bot}

### Paso 1: Abre BotFather
- Abre la app de **Telegram**
- Busca a **@BotFather** (es el bot oficial para crear bots)
- Haz clic para abrir la conversación

### Paso 2: Crea un nuevo bot
- Escribe `/newbot`
- BotFather te pedirá un nombre. Ejemplo: `Tu Cobrador Bot`
- Luego un username (debe terminar en `bot`). Ejemplo: `tu_cobrador_bot`

### Paso 3: Guarda tu TOKEN
BotFather te dará un mensaje como:

```
🎉 Done! Congratulations on your new bot. You'll find it at t.me/tu_cobrador_bot. 
You can now add a description, about section and commands. 
Use this token to access the HTTP API: 1234567890:ABCDEFGHIJKLMNOPQRSTUVWxyz...
```

**⚠️ IMPORTANTE:** Copia el TOKEN completo y guárdalo. Es como la contraseña de tu bot.

---

## 2. Configurar Variables de Entorno {#configurar-env}

### En el Backend

Abre el archivo `.env` en `CobradorBankend/`:

```env
# CONFIGURACIÓN DE BASE DE DATOS
MONGO_URI=mongodb+srv://tu_usuario:tu_password@cluster0.mongodb.net/cobrador

# CONFIGURACIÓN DE TELEGRAM BOT
TELEGRAM_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWxyz...

# CONFIGURACIÓN DE ENTORNO
NODE_ENV=development
PORT=3000

# CONFIGURACIÓN DEL FRONTEND
FRONTEND_URL=http://localhost:3001
```

**Reemplaza:**
- `tu_usuario` y `tu_password` con tus credenciales de MongoDB
- `1234567890:ABCDEFGHIJKLMNOPQRSTUVWxyz...` con tu TOKEN de Telegram

---

## 3. Instalar Dependencias {#instalar-dependencias}

En la terminal del backend:

```bash
cd CobradorBankend
npm install
```

Esto instalará:
- `node-telegram-bot-api` - Para comunicarse con Telegram
- `axios` - Para hacer peticiones HTTP

---

## 4. Configurar el Webhook {#configurar-webhook}

El webhook permite que Telegram te envíe los mensajes automáticamente.

### Opción A: Local (solo para desarrollo)

Para probar localmente, primero instala `ngrok` (expone tu servidor local en internet):

```bash
# Descargar ngrok desde https://ngrok.com/download

# En otra terminal:
ngrok http 3000
```

Te dará una URL como: `https://abc123.ngrok.io`

### Opción B: Producción (tu servidor real)

Si ya tienes el backend en Vercel o tu propio servidor, usa esa URL.

---

### Configurar el Webhook en Telegram

**Método 1: Con tu API**

```bash
# GET a tu servidor:
https://tudominio.com/api/telegram/setup-webhook?url=https://tudominio.com/api/telegram/webhook
```

O en **Postman:**

```
POST http://localhost:3000/api/telegram/setup-webhook?url=https://abc123.ngrok.io/api/telegram/webhook
```

**Respuesta esperada:**
```json
{
  "success": true,
  "mensaje": "Webhook configurado exitosamente",
  "url": "https://abc123.ngrok.io/api/telegram/webhook"
}
```

**Método 2: Con curl**

```bash
curl -X POST "http://localhost:3000/api/telegram/setup-webhook?url=https://abc123.ngrok.io/api/telegram/webhook"
```

---

## 5. Usar el Bot {#usar-el-bot}

### Acceder al Bot

Abre Telegram y busca a tu bot: `@tu_cobrador_bot`

O usa este link: `https://t.me/tu_cobrador_bot`

### Comandos Disponibles

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/start` o `/help` | Ver el menú | `/start` |
| `/crear_cliente` | Ver formato para crear cliente | `/crear_cliente` |
| `/crear_credito` | Ver formato para crear crédito | `/crear_credito` |
| `/consultar` | Consultar info de cliente | `/consultar` |
| `/pagar` | Registrar un pago | `/pagar` |

### Ejemplos de Uso

#### Crear Cliente
Escribe:
```
Juan Pérez|3155555555|1234567890|Calle 5 #10
```

El bot responderá:
```
✅ Cliente creado exitosamente

Nombre: Juan Pérez
Teléfono: 3155555555
Cédula: 1234567890
Dirección: Calle 5 #10
```

#### Crear Crédito
Para el cliente anterior, escribe:
```
3155555555|50000|0.30
```

(Teléfono | Monto | Tasa de interés)

El bot responderá:
```
💰 Crédito creado exitosamente

Cliente: Juan Pérez
Monto: $50,000
Tasa: 30.0%
Interés: $15,000
Total a pagar: $65,000
Estado: Activo
```

#### Consultar Cliente
Escribe el teléfono:
```
3155555555
```

El bot mostrará toda la información del cliente y sus créditos.

#### Registrar Pago
Escribe:
```
3155555555|5000
```

(Teléfono | Monto del pago)

---

## 6. Solucionar Problemas {#solucionar-problemas}

### Error: "TELEGRAM_TOKEN no está configurado"

**Solución:** Verifica que en `.env` tienes:
```env
TELEGRAM_TOKEN=tu_token_aqui
```

### El webhook no recibe mensajes

**Solución:** Verifica que está configurado correctamente:

```bash
# Obtener info del webhook:
GET http://localhost:3000/api/telegram/webhook-info
```

Debería mostrar tu URL configurada.

### ngrok dice "You didn't provide a URL to expose"

**Solución:** Espera a que tu servidor esté corriendo en puerto 3000:

```bash
# Terminal 1:
cd CobradorBankend && npm start

# Terminal 2:
ngrok http 3000
```

### El bot recibe el mensaje pero no responde

**Solución:** 
1. Verifica que el backend está corriendo
2. Mira los logs en la terminal
3. Asegúrate de que MongoDB está conectado

---

## 📚 Endpoints de la API Telegram

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/telegram/webhook` | Recibe mensajes de Telegram |
| POST | `/api/telegram/setup-webhook` | Configura el webhook |
| GET | `/api/telegram/webhook-info` | Info del webhook actual |
| DELETE | `/api/telegram/delete-webhook` | Elimina el webhook |
| POST | `/api/telegram/test-message` | Envía mensaje de prueba |
| GET | `/api/telegram/bot-info` | Info del bot |

---

## 🔐 Seguridad

**Nunca compartas:**
- Tu `TELEGRAM_TOKEN`
- Tu `MONGO_URI`
- Tus credenciales

**Recomendaciones:**
- Usa `.gitignore` para no subir `.env` a GitHub
- En producción, usa variables de entorno en tu hosting (Vercel, Heroku, etc.)
- Cambiar el TOKEN si lo compartiste accidentalmente

---

## 📞 Flujo Completo

```
Usuario escribe en Telegram
        ↓
Telegram envía POST a tu servidor
        ↓
Tu backend procesa el mensaje
        ↓
Se crea/consulta/actualiza la info en MongoDB
        ↓
El bot responde en Telegram
```

---

## 📝 Notas

- Los datos se guardan en tu base de datos MongoDB
- Cada cliente puede tener múltiples créditos
- Los pagos se registran automáticamente
- Todo está integrado con el sistema de Oficinas y Cobradores

---

¡Tu bot está listo! 🚀
