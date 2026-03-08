#!/bin/bash
# ===========================================
# MindFlow - Instalação automática no VPS
# Só rodar este script UMA VEZ no servidor
# ===========================================

set -e

echo ""
echo "========================================="
echo "  MindFlow - Instalando no servidor..."
echo "========================================="
echo ""

# 1. Instalar Docker se não tiver
if ! command -v docker &> /dev/null; then
  echo ">> Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  echo ">> Docker instalado!"
else
  echo ">> Docker já está instalado."
fi

# 2. Instalar Docker Compose plugin se não tiver
if ! docker compose version &> /dev/null; then
  echo ">> Instalando Docker Compose..."
  apt-get update && apt-get install -y docker-compose-plugin
  echo ">> Docker Compose instalado!"
else
  echo ">> Docker Compose já está instalado."
fi

# 3. Clonar o projeto (ou atualizar se já existe)
if [ -d "$HOME/mindflow" ]; then
  echo ">> Atualizando projeto..."
  cd "$HOME/mindflow"
  git pull origin main
else
  echo ">> Baixando projeto..."
  git clone https://github.com/murilomoraesx/MindFlow.git "$HOME/mindflow"
  cd "$HOME/mindflow"
fi

# 4. Criar .env se não existir
if [ ! -f "$HOME/mindflow/.env" ]; then
  echo ""
  echo "========================================="
  echo "  Configurando sua conta de admin..."
  echo "========================================="
  echo ""
  read -p "Seu nome: " MASTER_NAME
  read -p "Seu e-mail: " MASTER_EMAIL
  read -s -p "Sua senha: " MASTER_PASSWORD
  echo ""

  cat > "$HOME/mindflow/.env" << EOF
PORT=3003
MINDFLOW_MASTER_NAME=$MASTER_NAME
MINDFLOW_MASTER_EMAIL=$MASTER_EMAIL
MINDFLOW_MASTER_PASSWORD=$MASTER_PASSWORD
NODE_ENV=production
EOF

  echo ">> Conta criada!"
else
  echo ">> Arquivo .env já existe, mantendo configurações."
fi

# 5. Subir o app
echo ""
echo ">> Construindo e iniciando o MindFlow..."
cd "$HOME/mindflow"
docker compose up --build -d

# 6. Instalar Caddy para HTTPS (se tiver domínio)
echo ""
echo "========================================="
echo "  MindFlow está NO AR!"
echo "========================================="

# Pegar IP público
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "SEU_IP")

echo ""
echo "  Acesse: http://$PUBLIC_IP:3003"
echo ""
echo "  Para usar com domínio próprio e HTTPS,"
echo "  rode depois: bash ~/mindflow/setup-domain.sh"
echo ""
echo "========================================="
