#!/usr/bin/env bash
set -euo pipefail

# Executa a partir do diretório onde o script está.
diretorio_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$diretorio_script"

validar_arquivos_essenciais() {
  local arquivos_essenciais=("index.html" "src/main.tsx" "package.json")
  local arquivos_ausentes=()

  for arquivo in "${arquivos_essenciais[@]}"; do
    if [[ ! -f "$arquivo" ]]; then
      arquivos_ausentes+=("$arquivo")
    fi
  done

  if [[ ${#arquivos_ausentes[@]} -gt 0 ]]; then
    echo "ERRO: arquivos essenciais não encontrados para build:"
    printf ' - %s\n' "${arquivos_ausentes[@]}"
    echo "Diretório atual: $(pwd)"
    echo "Conteúdo do diretório:"
    ls -la
    exit 1
  fi
}

validar_build_css() {
  local arquivo_css="dist/assets/app.css"

  if [[ ! -f "$arquivo_css" ]]; then
    echo "ERRO: arquivo CSS final não encontrado em $arquivo_css"
    exit 1
  fi

  # Evita deploy com diretivas Tailwind não processadas, que quebram layout em produção.
  if rg -q "@apply|@tailwind" "$arquivo_css"; then
    echo "ERRO: CSS final contém diretivas Tailwind não processadas (@apply/@tailwind)."
    echo "Interrompendo deploy para evitar publicação com CSS quebrado."
    exit 1
  fi
}

echo "[1/3] Atualizando código com git pull..."
git pull

echo "[1.5/3] Validando estrutura do projeto..."
validar_arquivos_essenciais

echo "[2/3] Gerando build com npm run build..."
npm run build

echo "[2.5/3] Validando CSS final do build..."
validar_build_css

echo "[3/3] Reiniciando processo no PM2..."
pm2 restart postosujo 

echo "Deploy finalizado com sucesso."
