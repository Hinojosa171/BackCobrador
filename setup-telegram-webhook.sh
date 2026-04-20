#!/bin/bash
# Script para configurar el webhook de Telegram

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🤖 Configurador de Webhook de Telegram${NC}\n"

# Obtener inputs del usuario
read -p "¿Es localhost o un servidor remoto? (localhost/remote): " tipo_servidor

if [ "$tipo_servidor" == "localhost" ]; then
    read -p "¿Tienes ngrok corriendo? (s/n): " ngrok_corriendo
    
    if [ "$ngrok_corriendo" == "s" ]; then
        read -p "Ingresa tu URL de ngrok (ejemplo: https://abc123.ngrok.io): " ngrok_url
        WEBHOOK_URL="${ngrok_url}/api/telegram/webhook"
    else
        echo -e "${RED}❌ Primero inicia ngrok: ngrok http 3000${NC}"
        exit 1
    fi
else
    read -p "Ingresa tu dominio (ejemplo: https://tudominio.com): " dominio
    WEBHOOK_URL="${dominio}/api/telegram/webhook"
fi

read -p "¿Es desarrollo (localhost:3000) o producción? (dev/prod): " entorno

if [ "$entorno" == "dev" ]; then
    API_URL="http://localhost:3000"
else
    read -p "Ingresa la URL de tu API en producción: " API_URL
fi

echo -e "\n${YELLOW}Configurando webhook...${NC}\n"

# Hacer la petición
RESPONSE=$(curl -s -X POST "${API_URL}/api/telegram/setup-webhook?url=${WEBHOOK_URL}")

# Verificar la respuesta
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Webhook configurado exitosamente!${NC}"
    echo -e "📍 URL: ${GREEN}${WEBHOOK_URL}${NC}\n"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ Error al configurar webhook${NC}\n"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi

# Opcional: Obtener info del webhook
read -p "¿Ver información del webhook? (s/n): " ver_info

if [ "$ver_info" == "s" ]; then
    echo -e "\n${YELLOW}Obteniendo información del webhook...${NC}\n"
    curl -s -X GET "${API_URL}/api/telegram/webhook-info" | jq '.'
fi
