import { Helmet } from 'react-helmet-async';
import { montarUrlCanonica, montarUrlImagemCompartilhamento } from '../lib/seo';

interface PropriedadesSeoPagina {
  titulo: string;
  descricao: string;
  caminho: string;
  palavrasChave?: string;
  imagemCompartilhamento?: string;
  tipo?: 'website' | 'article';
}

export default function SeoPagina({
  titulo,
  descricao,
  caminho,
  palavrasChave,
  imagemCompartilhamento,
  tipo = 'website',
}: PropriedadesSeoPagina) {
  const urlCanonica = montarUrlCanonica(caminho);
  const urlImagemCompartilhamento = montarUrlImagemCompartilhamento(imagemCompartilhamento);

  return (
    <Helmet prioritizeSeoTags>
      <html lang="pt-BR" />
      <title>{titulo}</title>
      <meta name="description" content={descricao} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="theme-color" content="#050505" />
      <link rel="canonical" href={urlCanonica} />

      {palavrasChave ? <meta name="keywords" content={palavrasChave} /> : null}

      <meta property="og:locale" content="pt_BR" />
      <meta property="og:type" content={tipo} />
      <meta property="og:title" content={titulo} />
      <meta property="og:description" content={descricao} />
      <meta property="og:url" content={urlCanonica} />
      <meta property="og:image" content={urlImagemCompartilhamento} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={titulo} />
      <meta name="twitter:description" content={descricao} />
      <meta name="twitter:image" content={urlImagemCompartilhamento} />
    </Helmet>
  );
}
