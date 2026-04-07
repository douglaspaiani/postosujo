import 'dotenv/config';
import express from 'express';
import {
  agruparDenunciasPorPosto,
  inicializarDenunciasIniciais,
  listarDenuncias,
  salvarDenuncia
} from './repositorioDenuncias.js';
import { prismaCliente } from './prismaCliente.js';

const app = express();
const porta = Number(process.env.API_PORT || 3333);
const host = process.env.API_HOST || '127.0.0.1';

app.use(express.json());

app.use((_, resposta, proximo) => {
  resposta.setHeader('Access-Control-Allow-Origin', '*');
  resposta.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  resposta.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_.method === 'OPTIONS') {
    resposta.status(204).end();
    return;
  }
  proximo();
});

function validarDenuncia(denuncia) {
  const erros = [];

  if (!denuncia || typeof denuncia !== 'object') {
    return ['Payload inválido.'];
  }

  if (!denuncia.nome || String(denuncia.nome).trim().length < 2) {
    erros.push('Nome do posto é obrigatório.');
  }

  if (!denuncia.endereco || String(denuncia.endereco).trim().length < 5) {
    erros.push('Endereço é obrigatório.');
  }

  if (!denuncia.cidade || String(denuncia.cidade).trim().length < 2) {
    erros.push('Cidade é obrigatória.');
  }

  if (!denuncia.descricao || String(denuncia.descricao).trim().length < 5) {
    erros.push('Descrição é obrigatória.');
  }

  if (Number.isNaN(Number(denuncia.lat)) || Number.isNaN(Number(denuncia.lng))) {
    erros.push('Coordenadas inválidas.');
  }

  if (denuncia.dataDenuncia) {
    const dataConvertida = new Date(String(denuncia.dataDenuncia));
    if (Number.isNaN(dataConvertida.getTime())) {
      erros.push('Data da denúncia inválida.');
    }
  }

  return erros;
}

function obterDataDenunciaNormalizada(valorDataDenuncia) {
  if (!valorDataDenuncia) {
    return new Date().toISOString().split('T')[0];
  }

  const dataConvertida = new Date(String(valorDataDenuncia));
  if (Number.isNaN(dataConvertida.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return dataConvertida.toISOString().split('T')[0];
}

function normalizarDenuncia(denuncia) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    nome: String(denuncia.nome).trim(),
    endereco: String(denuncia.endereco).trim(),
    cidade: String(denuncia.cidade).trim(),
    lat: Number(denuncia.lat),
    lng: Number(denuncia.lng),
    descricao: String(denuncia.descricao).trim(),
    bandeira: denuncia.bandeira || 'outros',
    foto: denuncia.foto || null,
    dataDenuncia: obterDataDenunciaNormalizada(denuncia.dataDenuncia)
  };
}

app.get('/api/saude', (_, resposta) => {
  resposta.json({ status: 'ok', servico: 'api-denuncias' });
});

app.get('/api/denuncias', async (_, resposta) => {
  try {
    const denuncias = await listarDenuncias();
    resposta.json({ denuncias });
  } catch (erro) {
    resposta.status(500).json({ erro: 'Não foi possível listar denúncias.' });
  }
});

app.post('/api/denuncias', async (requisicao, resposta) => {
  const erros = validarDenuncia(requisicao.body);

  if (erros.length > 0) {
    resposta.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });
    return;
  }

  try {
    const denunciaNormalizada = normalizarDenuncia(requisicao.body);
    const denunciaSalva = await salvarDenuncia(denunciaNormalizada);
    resposta.status(201).json({ denuncia: denunciaSalva });
  } catch (erro) {
    console.error('Erro ao salvar denúncia:', erro);
    resposta.status(500).json({ erro: 'Não foi possível salvar a denúncia.' });
  }
});

app.get('/api/postos', async (_, resposta) => {
  try {
    const denuncias = await listarDenuncias();
    const postos = agruparDenunciasPorPosto(denuncias).sort((a, b) => {
      return new Date(b.ultimaDataDenuncia).getTime() - new Date(a.ultimaDataDenuncia).getTime();
    });

    resposta.json({ postos });
  } catch (erro) {
    resposta.status(500).json({ erro: 'Não foi possível agrupar os postos.' });
  }
});

async function iniciarServidor() {
  try {
    await prismaCliente.$connect();
    await inicializarDenunciasIniciais();

    app.listen(porta, host, () => {
      console.log(`API de denúncias ativa em http://${host}:${porta}`);
    });
  } catch (erro) {
    console.error('Falha ao iniciar API com Prisma:', erro);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prismaCliente.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaCliente.$disconnect();
  process.exit(0);
});

iniciarServidor();
