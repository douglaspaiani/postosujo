const URL_SITE_PADRAO = 'https://www.postosujo.com.br';
const IMAGEM_COMPARTILHAMENTO_PADRAO = '/images/logo.png';

export function obterUrlSite() {
  const urlConfigurada = import.meta.env.VITE_SITE_URL?.trim();
  if (!urlConfigurada) {
    return URL_SITE_PADRAO;
  }

  return urlConfigurada.replace(/\/+$/, '');
}

export function montarUrlCanonica(caminho: string) {
  const caminhoNormalizado = caminho.startsWith('/') ? caminho : `/${caminho}`;
  return `${obterUrlSite()}${caminhoNormalizado}`;
}

export function montarUrlImagemCompartilhamento(imagem?: string) {
  if (!imagem) {
    return `${obterUrlSite()}${IMAGEM_COMPARTILHAMENTO_PADRAO}`;
  }

  if (imagem.startsWith('http://') || imagem.startsWith('https://')) {
    return imagem;
  }

  const imagemNormalizada = imagem.startsWith('/') ? imagem : `/${imagem}`;
  return `${obterUrlSite()}${imagemNormalizada}`;
}
