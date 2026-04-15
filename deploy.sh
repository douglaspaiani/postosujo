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

instalar_dependencias_build() {
  if [[ -f "package-lock.json" ]]; then
    # Garante versão idêntica das dependências entre ambientes, inclusive devDeps
    # usadas durante a compilação de CSS (Tailwind/Vite).
    npm ci --include=dev
    return
  fi

  echo "Aviso: package-lock.json não encontrado. Usando npm install --include=dev."
  npm install --include=dev
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

echo "[1/4] Atualizando código com git pull..."
git pull

echo "[1.5/4] Validando estrutura do projeto..."
validar_arquivos_essenciais

echo "[2/4] Instalando dependências de build..."
instalar_dependencias_build

echo "[3/4] Gerando build com npm run build..."
npm run build

echo "[3.5/4] Validando CSS final do build..."
validar_build_css

echo "[4/4] Reiniciando processo no PM2..."
pm2 restart postosujo 

echo "Deploy finalizado com sucesso."
