import { CriarDenunciaPayload, Denuncia, PostoAgrupado } from '../types';

const baseApi = import.meta.env.VITE_API_URL || '';

async function requisicaoJson<T>(url: string, opcoes?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${baseApi}${url}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...(opcoes?.headers || {})
      }
    });
  } catch {
    throw new Error('API indisponível. Inicie o backend com `npm run dev:api`.');
  }

  if (!resposta.ok) {
    let mensagemErro = 'Falha ao comunicar com a API.';

    try {
      const corpoErro = await resposta.json();
      if (corpoErro?.erro) {
        mensagemErro = corpoErro.erro;
      }
    } catch {
      // Mantemos a mensagem padrão quando a API retorna conteúdo não JSON.
    }

    throw new Error(mensagemErro);
  }

  return resposta.json() as Promise<T>;
}

export async function criarDenuncia(payload: CriarDenunciaPayload): Promise<Denuncia> {
  const resposta = await requisicaoJson<{ denuncia: Denuncia }>('/api/denuncias', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return resposta.denuncia;
}

export async function listarPostosAgrupados(): Promise<PostoAgrupado[]> {
  const resposta = await requisicaoJson<{ postos: PostoAgrupado[] }>('/api/postos');
  return resposta.postos;
}
