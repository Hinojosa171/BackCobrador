#!/bin/bash

# 🚀 SCRIPT DE INSTALACIÓN RÁPIDA - SISTEMA RAG

echo "╔════════════════════════════════════════════════════╗"
echo "║  🚀 INSTALACIÓN DEL SISTEMA RAG + TELEGRAM + GEMINI║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verificar Node.js
echo "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    echo "Descárgalo en: https://nodejs.org/"
    exit 1
fi
print_success "Node.js encontrado: $(node -v)"
echo ""

# 2. Ir a carpeta backend
cd CobradorBankend || { print_error "No se encontró carpeta CobradorBankend"; exit 1; }
print_info "Instalando dependencias del backend..."
echo ""

# 3. Instalar dependencias
npm install

print_success "Backend configurado"
echo ""

# 4. Crear carpeta uploads
if [ ! -d "uploads" ]; then
    mkdir uploads
    print_success "Carpeta uploads creada"
fi
echo ""

# 5. Verificar .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Archivo .env creado desde .env.example"
        print_info "⚠️  IMPORTANTE: Edita .env y completa:"
        echo "    - GEMINI_API_KEY"
        echo "    - TELEGRAM_TOKEN"
        echo "    - MONGO_URI"
    else
        print_error "No se encontró .env.example"
    fi
else
    print_info ".env ya existe"
fi
echo ""

# 6. Ir a carpeta frontend
cd ../CobradorFrontend || { print_error "No se encontró carpeta CobradorFrontend"; exit 1; }
print_info "Instalando dependencias del frontend..."
echo ""

# 7. Instalar dependencias frontend
npm install

print_success "Frontend configurado"
echo ""

# Fin
echo "╔════════════════════════════════════════════════════╗"
echo "║           ✅ INSTALACIÓN COMPLETADA               ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}📝 PRÓXIMOS PASOS:${NC}"
echo ""
echo "1. Edita CobradorBankend/.env con:"
echo "   - GEMINI_API_KEY: https://makersuite.google.com/app/apikey"
echo "   - TELEGRAM_TOKEN: @BotFather en Telegram"
echo "   - MONGO_URI: MongoDB Atlas"
echo ""
echo "2. Inicia el backend:"
echo "   cd CobradorBankend && npm start"
echo ""
echo "3. En otra terminal, inicia el frontend:"
echo "   cd CobradorFrontend && npm start"
echo ""
echo "4. Carga un PDF:"
echo "   curl -F 'pdf=@archivo.pdf' http://localhost:3000/api/rag/upload-pdf"
echo ""
echo "5. Usa el bot en Telegram:"
echo "   Busca tu bot → /start → Haz preguntas"
echo ""
echo -e "${GREEN}🎉 ¡Sistema listo para usar!${NC}"
