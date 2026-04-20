# 🤖 GUÍA DE PRUEBAS - TELEGRAM BOT MONGODB

## ✅ Estado Actual del Sistema

**Backend:** ✅ Corriendo en puerto 3000
**MongoDB:** ✅ Conectado a TuCobradorDB
**Telegram Bot:** ✅ @shlegacy_bot (8436676864:AAGwJ2NuWfx_biNlp2cwKLZGAQQoCK9498g)
**Webhook:** ✅ Configurado en ngrok

---

## 📋 Flujos a Probar

### 1️⃣ CREAR CLIENTE
**Ruta en Bot:** `/start` → **Botón "📝 Crear Cliente"**

**Pasos:**
```
1. Enviar /start en Telegram
2. Presionar botón "📝 Crear Cliente"
3. Escribir nombre: "Juan Pérez"
4. Escribir teléfono: "3155555555"
5. Escribir cédula: "1234567890"
6. Escribir dirección: "Calle 5 #10-20"
7. ✅ Ver confirmación
8. ✅ Verificar en MongoDB
```

**Verificación MongoDB:**
```javascript
// En Compass o Mongosh
use TuCobradorDB
db.clientes.findOne({ telefono: "3155555555" })

// Debe retornar:
{
  _id: ObjectId(...),
  nombre: "Juan Pérez",
  telefono: "3155555555",
  cedula: "1234567890",
  direccion: "Calle 5 #10-20",
  estado: "activo",
  telegramId: <CHAT_ID>
}
```

---

### 2️⃣ CREAR CRÉDITO
**Ruta en Bot:** `/start` → **Botón "💰 Crear Crédito"**

**Pasos:**
```
1. Presionar botón "💰 Crear Crédito"
2. Escribir teléfono del cliente: "3155555555"
3. Escribir monto: "50000"
4. Escribir tasa: "0.30" (para 30%)
5. ✅ Ver confirmación con cálculos
   - Monto: $50,000
   - Tasa: 30%
   - Interés: $15,000
   - Total: $65,000
6. ✅ Verificar en MongoDB
```

**Verificación MongoDB:**
```javascript
db.creditos.findOne({ "cliente_id": ObjectId("...") })

// Debe retornar:
{
  _id: ObjectId(...),
  montoBase: 50000,          // ✅ NUEVO CAMPO
  tasaInteres: 0.30,         // ✅ NUEVO CAMPO
  interes: 15000,            // Calculado: 50000 * 0.30
  montoTotal: 65000,         // Calculado: 50000 + 15000
  montoPagado: 0,            // ✅ NUEVO CAMPO
  estado: "Pendiente",       // ✅ NUEVO ESTADO
  clienteId: ObjectId("..."),
  fechaCreacion: 2026-04-19...,
  fechaVencimiento: null,
  fechaPago: null
}
```

---

### 3️⃣ CONSULTAR CLIENTE
**Ruta en Bot:** `/start` → **Botón "🔍 Consultar Cliente"**

**Pasos:**
```
1. Presionar botón "🔍 Consultar Cliente"
2. Escribir teléfono: "3155555555"
3. ✅ Ver información completa del cliente
4. ✅ Ver lista de créditos con detalles
```

**Información que debe mostrarse:**
```
👤 Información del Cliente

Nombre: Juan Pérez
Teléfono: 3155555555
Cédula: 1234567890
Dirección: Calle 5 #10-20
Estado: activo

Créditos (1):

1. Crédito:
   💰 Monto: $50,000          ✅ montoBase
   📊 Total a pagar: $65,000  ✅ montoTotal
   📈 Estado: Pendiente       ✅ NUEVO
   📅 Fecha: 19/4/2026
```

---

### 4️⃣ REGISTRAR PAGO
**Ruta en Bot:** `/start` → **Botón "💳 Registrar Pago"**

**Pasos:**
```
1. Presionar botón "💳 Registrar Pago"
2. Escribir teléfono: "3155555555"
3. Ver información del crédito:
   - Monto original: $50,000
   - Total a pagar: $65,000
   - Pagado: $0
   - Restante: $65,000
4. Escribir monto a pagar: "20000"
5. ✅ Ver confirmación
6. ✅ Verificar en MongoDB que se actualizó
```

**Verificación MongoDB después de pago:**
```javascript
// Crédito actualizado
db.creditos.findOne({ "cliente_id": ObjectId("...") })
{
  montoPagado: 20000,        // ✅ ACTUALIZADO
  estado: "Pendiente"        // ✅ Sigue pendiente (45000 restantes)
}

// Nuevo pago guardado
db.pagos.findOne({ "telefono": "3155555555" })
{
  _id: ObjectId(...),
  creditoId: ObjectId("..."),
  clienteId: ObjectId("..."),
  monto: 20000,
  fecha: 2026-04-19...,
  telegramId: <CHAT_ID>
}
```

---

### 5️⃣ REGISTRAR PAGO COMPLETO
**Ruta en Bot:** `/start` → **Botón "💳 Registrar Pago"**

**Pasos:**
```
1. Presionar botón "💳 Registrar Pago"
2. Escribir teléfono: "3155555555"
3. Ver saldo restante: $45,000
4. Escribir monto: "45000" (pago final)
5. ✅ Ver confirmación de CRÉDITO PAGADO
6. ✅ Verificar que estado cambió a "Pagado"
```

**Verificación MongoDB:**
```javascript
db.creditos.findOne({ "cliente_id": ObjectId("...") })
{
  montoPagado: 65000,        // ✅ TOTAL
  estado: "Pagado"           // ✅ ESTADO CAMBIÓ
}
```

---

## 🔍 Checklist de Validación

### Botones Funcionan ✅
- [ ] Menú principal carga
- [ ] Botón "Crear Cliente" abre flujo
- [ ] Botón "Crear Crédito" abre flujo
- [ ] Botón "Consultar Cliente" abre flujo
- [ ] Botón "Registrar Pago" abre flujo
- [ ] Botones "Menú Principal" regresan al inicio

### Datos Se Guardan en MongoDB ✅
- [ ] Clientes se crean en colección `clientes`
- [ ] Créditos con campos camelCase en `creditos`
- [ ] Pagos se registran en colección `pagos`
- [ ] Campos `montoBase`, `tasaInteres`, `interes`, `montoTotal` presentes
- [ ] Campo `montoPagado` se actualiza correctamente

### Cálculos Correctos ✅
- [ ] Interés = montoBase * tasaInteres
- [ ] Interés se calcula automáticamente al guardar
- [ ] montoTotal = montoBase + interes
- [ ] Estado cambia a "Pagado" cuando montoPagado = montoTotal

### Flujos Completos ✅
- [ ] Crear cliente → Consultar → Ver en MongoDB
- [ ] Crear crédito → Ver con intereses → Consultar
- [ ] Registrar pago → Actualiza montoPagado → Estado correcto

---

## 🐛 Errores Esperados (No presionar botones rápido)

| Error | Causa | Solución |
|-------|-------|----------|
| "Cliente no encontrado" | Teléfono no existe | Crear cliente primero |
| "Cliente no tiene créditos" | No se creó crédito | Crear crédito del cliente |
| "Teléfono inválido" | Menos de 7 dígitos | Ingresar número válido |
| "Monto excede lo adeudado" | Pagando más del debido | Ingresar monto correcto |

---

## 📊 Queries MongoDB para Validar

### Ver todos los clientes creados desde Telegram
```javascript
db.clientes.find({ telegramId: { $exists: true } })
```

### Ver todos los créditos con nuevos campos
```javascript
db.creditos.find({}).project({
  montoBase: 1,
  tasaInteres: 1,
  interes: 1,
  montoTotal: 1,
  montoPagado: 1,
  estado: 1
})
```

### Ver histórico de pagos
```javascript
db.pagos.find({}).sort({ fecha: -1 })
```

### Validar cálculos de interés
```javascript
db.creditos.find({}).forEach(credito => {
  if (credito.interes !== credito.montoBase * credito.tasaInteres) {
    print("❌ Error en cálculo de interés para: " + credito._id);
  }
})
```

---

## 🚀 Paso a Paso para Empezar a Probar

### Terminal 1: Backend
```bash
cd c:\Users\USUARIO\Desktop\Cobrador\CobradorBankend
npm start
# Esperar a ver: "✅ Conectado a MongoDB Atlas"
```

### Terminal 2: Telegram
```bash
1. Abrir Telegram
2. Buscar: @shlegacy_bot
3. Presionar /start
4. Probar flujos según checklist
```

### Terminal 3: MongoDB (Mongosh)
```bash
mongosh "mongodb+srv://usuario:password@cluster.mongodb.net/TuCobradorDB"
# O usar MongoDB Compass

# Ejecutar queries para validar
```

---

## ✅ Cómo Saber que Todo Funciona

**Telegram Bot:**
- ✅ Responde con botones
- ✅ No muestra errores
- ✅ Botones funcionan al presionar
- ✅ Mensajes de confirmación muestran datos correctos

**MongoDB:**
- ✅ Nuevos documentos aparecen inmediatamente
- ✅ Campos tienen nombres correctos (montoBase, no monto_prestado)
- ✅ Cálculos de interés están correctos
- ✅ Estado cambia de "Pendiente" a "Pagado"

**Consola Backend:**
```
✅ Cliente creado desde Telegram: Juan Pérez
✅ Crédito creado desde Telegram para Juan Pérez
✅ Pago registrado desde Telegram para Juan Pérez
```

---

## 📝 Notas Importantes

1. **Estádos de Crédito:** Ahora son "Pendiente" (no "activo") y "Pagado" (no "Realizado")
2. **Campos Numéricos:** montoBase, tasaInteres, interes, montoTotal son TODOS en la base de datos
3. **Validación:** Teléfono no puede repetirse en clientes
4. **Pago:** Solo se puede registrar en créditos con estado "Pendiente" o "Pagado" (NO "Vencido")

---

**Cuando TODO esté validado y funcionando ✅:**
1. Hacer commit a git
2. Push a repositorio
3. Deploy a Vercel

**Próximo:** PRIORITY 2 - Bcrypt + JWT (después de validar)
