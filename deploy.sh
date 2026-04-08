#!/usr/bin/env bash
set -euo pipefail

# Executa a partir do diretório onde o script está.
diretorio_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$diretorio_script"

echo "[1/3] Atualizando código com git pull..."
git pull

echo "[2/3] Gerando build com npm run build..."
npm run build

echo "[3/3] Reiniciando processo no PM2..."
pm2 restart postosujo 

echo "Deploy finalizado com sucesso."
