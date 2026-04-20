# 🔐 PRIORITY 2: SEGURIDAD Y AUTENTICACIÓN

## 📌 Contexto
El sistema está **funcional pero vulnerable**. Esta fase implementa seguridad fuerte.

---

## 🎯 Tareas Priority 2

### 1. 🔒 Consolidar 3 Logins en 1 Middleware
**Archivo:** `middleware/auth.js` (NUEVO)

**Problema Actual:**
- 3 funciones login duplicadas (gerenteController, cobrador, oficina)
- Mismo código repetido 3 veces
- Difícil de mantener

**Solución:**
```javascript
// middleware/auth.js - NUEVO
const loginMiddleware = async (req, res, next) => {
  const { usuario, password, rol } = req.body;
  
  // Validar entrada
  if (!usuario || !password || !rol) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }
  
  const Model = { gerente: Gerente, cobrador: Cobrador, oficina: Oficina }[rol];
  if (!Model) return res.status(400).json({ error: 'Rol inválido' });
  
  const user = await Model.findOne({ usuario, password });
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  
  // Generar JWT aquí (paso 3)
  req.user = user;
  next();
};

module.exports = loginMiddleware;
```

**Beneficio:** 
- ✅ Código centralizado
- ✅ Fácil de auditar
- ✅ Consistente para todos los roles

---

### 2. 🔑 Agregar Bcrypt para Hashing
**Instalación:**
```bash
npm install bcrypt
```

**Cambios en Models:**

#### A. models/Gerente.js
```javascript
const bcrypt = require('bcrypt');

GerentiSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

GerentiSchema.methods.compararPassword = function(pwd) {
  return bcrypt.compare(pwd, this.password);
};
```

#### B. models/Cobrador.js (similar)
#### C. models/Oficina.js (similar)

**Cambios en Controllers:**

```javascript
// gerenteController.js - loginGerente
const loginGerente = async (req, res) => {
  const { usuario, password } = req.body;
  const gerente = await Gerente.findOne({ usuario });
  
  if (!gerente || !await gerente.compararPassword(password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  // Generar JWT (paso 3)
  res.json({ gerente });
};
```

**Beneficio:**
- 🛡️ Passwords NUNCA se guardan en plain text
- 🛡️ Imposible recuperar password original
- 🛡️ Cumple estándares de seguridad

---

### 3. 🎫 Implementar JWT Authentication
**Instalación:**
```bash
npm install jsonwebtoken
```

**Crear archivo:** `services/jwtService.js`

```javascript
const jwt = require('jsonwebtoken');

class JWTService {
  static generarToken(userId, rol) {
    return jwt.sign(
      { userId, rol, exp: Date.now() + 24 * 60 * 60 * 1000 }, // 24 horas
      process.env.JWT_SECRET || 'tu-secret-key-segura'
    );
  }
  
  static verificarToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'tu-secret-key-segura');
    } catch (err) {
      return null;
    }
  }
}

module.exports = JWTService;
```

**Middleware Protección:** `middleware/verificarToken.js`

```javascript
const JWTService = require('../services/jwtService');

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  const decoded = JWTService.verificarToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  req.user = decoded;
  next();
};

module.exports = verificarToken;
```

**Uso en Rutas:**
```javascript
// api/index.js
const verificarToken = require('../middleware/verificarToken');

// Proteger ruta de estadísticas
app.get('/api/gerentes/:gerenteID/estadisticas', verificarToken, estadisticasGerente);
```

**Beneficio:**
- 🔐 Sesiones seguras con expiración
- 🔐 Revocación de tokens posible
- 🔐 Escalable para múltiples servidores

---

### 4. ✓ Agregar express-validator
**Instalación:**
```bash
npm install express-validator
```

**Crear archivo:** `middleware/validaciones.js`

```javascript
const { body, validationResult } = require('express-validator');

const validarGerente = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('usuario').notEmpty().withMessage('Usuario requerido'),
  body('password').isLength({ min: 6 }).withMessage('Password mín 6 caracteres'),
  body('cedula').matches(/^\d{6,15}$/).withMessage('Cédula inválida'),
  body('celular').matches(/^\+?\d{7,15}$/).withMessage('Celular inválido'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];

module.exports = { validarGerente };
```

**Uso:**
```javascript
app.post('/api/gerentes', validarGerente, crearGerente);
```

**Beneficio:**
- ✓ Validación consistente
- ✓ Protección contra inyecciones
- ✓ Mensajes de error claros

---

## 📋 Plan de Implementación

### Fase 1: Bcrypt (Estimado: 1 hora)
```bash
1. Instalar bcrypt
2. Modificar 3 modelos (add pre('save') y compararPassword)
3. Actualizar 3 controllers (usar compararPassword)
4. Probar logins en Postman
```

### Fase 2: JWT (Estimado: 1.5 horas)
```bash
1. Crear jwtService.js
2. Crear middleware verificarToken.js
3. Actualizar logins para retornar token
4. Proteger rutas sensibles
5. Probar tokens en Postman
```

### Fase 3: Validaciones (Estimado: 1 hora)
```bash
1. Crear validaciones.js
2. Aplicar a todas rutas POST
3. Agregar sanitización
4. Probar validaciones
```

### Fase 4: Consolidar Logins (Estimado: 30 min)
```bash
1. Crear auth middleware
2. Refactorizar 3 controllers
3. Eliminar duplicación
4. Probar funcionamiento
```

**Total:** ~4 horas para implementación completa

---

## 🧪 Testing Strategy

### Antes de cada cambio:
```bash
# Terminal 1: Backend
node api/index.js

# Terminal 2: Tests con curl
curl -X POST http://localhost:3000/api/gerentes/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"123456"}'
```

### Casos a Probar:
1. ✓ Login sin credentials → Error 400
2. ✓ Login con password incorrecto → Error 401
3. ✓ Login exitoso → Retorna JWT token
4. ✓ Request sin token → Error 401
5. ✓ Request con token inválido → Error 401
6. ✓ Request con token válido → Acceso permitido

---

## 🔄 Rollback Plan

Si algo falla:
```bash
# Revertir cambios
git checkout -- .

# O restaurar desde backup
cp CAMBIOS_IMPLEMENTADOS.md .env  # documentación
```

---

## 📊 Checklist de Terminación

- [ ] Bcrypt instalado y funcionando
- [ ] JWT tokens generados en login
- [ ] Middleware verificarToken protege rutas
- [ ] express-validator validando entrada
- [ ] Todos los logins consolidados
- [ ] Pruebas manuales pasadas
- [ ] Documentación actualizada
- [ ] Token expira después de 24 horas

---

## 📝 Variables de Entorno Nuevas

Agregar a `.env`:
```env
JWT_SECRET=tu-secret-key-muy-segura-cambiar-en-produccion
JWT_EXPIRE=24h
```

---

**Próximo Paso:** ¿Implementar Priority 2 ahora o esperar?
