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

detectar_diretivas_tailwind_nao_processadas() {
  local caminho_arquivo="$1"

  if command -v rg >/dev/null 2>&1; then
    rg -q "@apply|@tailwind" "$caminho_arquivo"
    return $?
  fi

  grep -Eq "@apply|@tailwind" "$caminho_arquivo"
}

detectar_assinaturas_utilitarias_compiladas() {
  local caminho_arquivo="$1"
  # Assinaturas de classes utilitárias esperadas no build desta aplicação.
  # Se existirem, o CSS está compilado mesmo que alguma diretiva crua tenha sobrado.
  local padrao_assinaturas="\\.flex\\{|\\.min-h-screen\\{|\\.pointer-events-none\\{|\\.bg-brand-dark\\{|\\.text-white\\/60\\{"

  if command -v rg >/dev/null 2>&1; then
    rg -q "$padrao_assinaturas" "$caminho_arquivo"
    return $?
  fi

  grep -Eq "$padrao_assinaturas" "$caminho_arquivo"
}

validar_build_css() {
  local diretorio_assets="dist/assets"
  local arquivo_css=""
  local encontrou_css=0

  if [[ ! -d "$diretorio_assets" ]]; then
    echo "ERRO: diretório de assets não encontrado em $diretorio_assets"
    exit 1
  fi

  while IFS= read -r arquivo_css; do
    [[ -z "$arquivo_css" ]] && continue
    encontrou_css=1

    # Se houver diretivas cruas sem utilitários compilados, bloqueia o deploy.
    # Se utilitários estiverem presentes, apenas alerta (alguns builds mantêm a diretiva).
    if detectar_diretivas_tailwind_nao_processadas "$arquivo_css"; then
      if detectar_assinaturas_utilitarias_compiladas "$arquivo_css"; then
        echo "Aviso: diretivas Tailwind detectadas em $arquivo_css, mas utilitários compilados também foram encontrados."
        echo "Deploy seguirá normalmente."
      else
        echo "ERRO: CSS final contém diretivas Tailwind não processadas (@apply/@tailwind) sem utilitários compilados."
        echo "Arquivo com problema: $arquivo_css"
        echo "Interrompendo deploy para evitar publicação com CSS quebrado."
        exit 1
      fi
    fi
  done < <(find "$diretorio_assets" -maxdepth 1 -type f -name '*.css' | sort)

  if [[ "$encontrou_css" -eq 0 ]]; then
    echo "ERRO: nenhum arquivo CSS encontrado em $diretorio_assets"
    exit 1
  fi
}

reiniciar_servico_frontend() {
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart postosujo
    return
  fi

  echo "Aviso: PM2 não encontrado neste ambiente."
  echo "Build concluído. Reinicie o serviço de frontend manualmente para publicar a nova versão."
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
reiniciar_servico_frontend

echo "Deploy finalizado com sucesso."
