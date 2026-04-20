# 🚀 GUÍA: GIT + VERCEL - PASO A PASO

## 📋 ESTADO ACTUAL
- ✅ Backend funciona en http://localhost:3000
- ✅ Telegram bot responde con botones
- ✅ MongoDB guarda datos correctamente
- ✅ Todas las pruebas pasan (13/13)
- ⏳ Listo para subir a Git y deployar en Vercel

---

## 🔧 PASO 1: PREPARAR GIT LOCALMENTE

### 1.1 Verificar que estamos en la carpeta correcta
```powershell
cd c:\Users\USUARIO\Desktop\Cobrador\CobradorBankend

# Ver rama y estado
git status
```

**Esperado:**
```
On branch main (o master)
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  modified:   models/Credito.js
  modified:   models/Cliente.js
  modified:   models/Pago.js
  modified:   services/telegramService.js
  ...
```

### 1.2 Verificar .gitignore tiene lo necesario
```bash
cat .gitignore
```

**Debe contener:**
```
node_modules/
.env
.DS_Store
*.log
```

Si falta `.env`, agregarlo:
```powershell
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
```

### 1.3 Verificar que .env NO está staged
```bash
git status | findstr ".env"

# Resultado esperado: (nada, .env no debe aparecer)
```

---

## 📝 PASO 2: HACER COMMITS ORGANIZADOS

Vamos a hacer commits separados por categoría para una historia clara:

### 2.1 Commit 1: Modelos actualizados
```powershell
# Ver cambios en modelos
git diff models/

# Agregar solo los modelos
git add models/Credito.js models/Cliente.js models/Pago.js

# Verificar
git status

# Commit
git commit -m "feat: estandarizar modelos con camelCase y cálculos automáticos

- Credito.js: renombrar campos (montoBase, tasaInteres, interes, montoTotal)
- Agregar pre('validate') para cálculos automáticos de interés
- Cliente.js: agregar estado, telegramID, fechaCreacion
- Pago.js: renombrar campos a estándar (creditoID, clienteID, telegramID)"
```

### 2.2 Commit 2: TelegramService arreglado
```powershell
git add services/telegramService.js

git commit -m "fix: corregir referencias de campos en telegramService

- Cambiar clienteId → clienteID en todas las referencias
- Cambiar creditoId → creditoID
- Cambiar telegramId → telegramID
- Actualizar flujos para usar campos correctos del modelo"
```

### 2.3 Commit 3: Scripts de validación
```powershell
git add test-telegram.js validate-mongodb.js migrate.js ver-todo.js debug-mongodb.js

git commit -m "test: agregar scripts de prueba y validación

- test-telegram.js: simula flujos completos (13 pruebas)
- validate-mongodb.js: valida datos en MongoDB
- migrate.js: limpia datos antiguos y crea datos de prueba
- ver-todo.js: muestra contenido completo de BD
- debug-mongodb.js: debug de estructura"
```

### 2.4 Commit 4: Documentación
```powershell
git add *.md

git commit -m "docs: agregar guías de pruebas y producción

- README_TELEGRAM_COMPLETO.md: estado final del sistema
- GUIA_PRUEBAS_TELEGRAM_MONGODB.md: instrucciones de validación
- PRIORITY_2_SEGURIDAD.md: próximos pasos (JWT, bcrypt)
- CLEANUP_COMPLETADO.md: resumen de cambios"
```

### 2.5 Ver todos los commits
```powershell
git log --oneline -10
```

---

## 🌐 PASO 3: PUSH A GITHUB

### 3.1 Verificar remoto
```powershell
git remote -v

# Esperado:
# origin  https://github.com/Hinojosa171/CobradorBankend.git (fetch)
# origin  https://github.com/Hinojosa171/CobradorBankend.git (push)
```

### 3.2 Push a la rama
```powershell
# Si rama es "main"
git push origin main

# Si rama es "master"
git push origin master

# Resultado esperado:
# Enumerating objects: X done.
# Counting objects: 100% (X/X), done.
# Compressing objects: 100% (X/X), done.
# Writing objects: 100% (X/X), X bytes, done.
# To https://github.com/Hinojosa171/CobradorBankend.git
#    abc1234..def5678  main -> main
```

### 3.3 Verificar en GitHub
1. Abre: https://github.com/Hinojosa171/CobradorBankend
2. Verifica que ves los 4 commits nuevos
3. Verifica que NO ves `.env` en los cambios

---

## 🚀 PASO 4: DEPLOY EN VERCEL

### 4.1 Opción A: Vercel Auto-Deploy desde GitHub (Recomendado)

**Primera vez:**
1. Ir a: https://vercel.com/dashboard
2. Click en "New Project"
3. Click en "Import Git Repository"
4. Seleccionar: `Hinojosa171/CobradorBankend`
5. Click "Import"
6. En la pantalla de configuración:
   - **Project Name:** tu-cobrador-backend (o similar)
   - **Framework:** Other
   - **Root Directory:** ./  (por defecto)
   - Click "Continue"

### 4.2 Configurar Variables de Entorno

En la pantalla **Environment Variables**:
1. Agregar variable: `MONGO_URI`
   - Value: `mongodb+srv://user:password@cluster.mongodb.net/TuCobradorDB`
   
2. Agregar variable: `TELEGRAM_TOKEN`
   - Value: `8436676864:AAGwJ2NuWfx_biNlp2cwKLZGAQQoCK9498g`

3. Agregar variable: `NODE_ENV`
   - Value: `production`

4. Click "Deploy"

### 4.3 Esperar Deployment
- Vercel mostrará progreso
- Cuando termine, mostrará URL: `https://tu-cobrador-backend.vercel.app`

### 4.4 Verificar Deployment
```powershell
# Reemplaza con tu URL de Vercel
$url = "https://tu-cobrador-backend.vercel.app"

# Test health check
Invoke-WebRequest -Uri "$url/api/test" -Method GET

# Esperado: {"mensaje":"¡El backend está vivo y respondiendo!"}
```

---

## 📡 PASO 5: ACTUALIZAR WEBHOOK DE TELEGRAM

Una vez que Vercel da la URL:

```powershell
# Reemplaza TU_VERCEL_URL por la URL real
$vercelUrl = "https://tu-cobrador-backend.vercel.app"

# Actualizar webhook
$response = Invoke-WebRequest `
  -Uri "$vercelUrl/api/telegram/setup-webhook?url=$vercelUrl/api/telegram/webhook" `
  -Method POST `
  -UseBasicParsing

$response.Content

# Esperado:
# {"success":true,"mensaje":"Webhook configurado exitosamente", ...}
```

### 5.2 Verificar que está configurado
```powershell
$response = Invoke-WebRequest `
  -Uri "$vercelUrl/api/telegram/webhook-info" `
  -Method GET `
  -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json

# Esperado: mostrará la URL de webhook configurada
```

---

## ✅ PASO 6: VERIFICAR BOT EN PRODUCCIÓN

1. **Abre Telegram**
2. **Busca:** @shlegacy_bot
3. **Envía:** /start
4. **Verifica:** Botones aparecen
5. **Prueba:**
   - Click en "📝 Crear Cliente"
   - Ingresa datos
   - Verifica en MongoDB que se guardó

```powershell
# Desde terminal, ver datos en BD
node ver-todo.js
```

---

## 🎯 CHECKLIST FINAL

- [ ] Commits locales completados (4 commits)
- [ ] Git status muestra "working tree clean"
- [ ] Git push exitoso a GitHub
- [ ] GitHub muestra los 4 commits nuevos
- [ ] Vercel deploy completado
- [ ] URL de Vercel funciona: `/api/test` responde
- [ ] Webhook configurado a URL de Vercel
- [ ] Bot en Telegram responde con botones
- [ ] Datos se guardan en MongoDB en producción

---

## 🐛 Troubleshooting

### Si Vercel falla:
```
1. Verificar variables de entorno en Vercel dashboard
2. Verificar que .env NO está en git (git ls-files | grep .env)
3. Ver logs: click en deployment → "View Build Logs"
4. Redeploy: click en "..." → Redeploy
```

### Si bot no responde en producción:
```
1. Verificar webhook: 
   curl https://tu-vercel.app/api/telegram/webhook-info
2. Verificar token está correcto
3. Verificar MongoDB accesible desde Vercel
4. Ver logs en Vercel
```

### Si MongoDB no guarda:
```
1. Verificar MONGO_URI en Vercel variables
2. Verificar que IP de Vercel está en MongoDB Atlas whitelist
   - En MongoDB Atlas → Network Access
   - Click en Edit
   - Add IP Address: 0.0.0.0/0 (permite todas)
   - O: agregar IPs específicas de Vercel
```

---

## 📊 Resumen de URLs

| Componente | Local | Producción |
|-----------|-------|-----------|
| Backend | http://localhost:3000 | https://tu-vercel.vercel.app |
| Health Check | /api/test | /api/test |
| Webhook Telegram | ngrok URL | tu-vercel.vercel.app/api/telegram/webhook |
| Bot | @shlegacy_bot | @shlegacy_bot (mismo) |
| MongoDB | Atlas | Atlas (mismo) |

---

## 🎉 ¡LISTO!

Una vez completes todos los pasos:
- ✅ El bot funciona en producción
- ✅ Los datos se guardan en MongoDB
- ✅ El código está en GitHub
- ✅ Todo está deployado en Vercel

**Próximo:** Priority 2 - Seguridad (JWT, Bcrypt)

