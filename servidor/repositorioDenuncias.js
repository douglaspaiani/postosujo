import { promises as fs } from 'node:fs';
import path from 'node:path';
import { prismaCliente } from './prismaCliente.js';

const caminhoArquivoDenuncias = path.resolve(process.cwd(), 'dados', 'denuncias.json');

function textoNormalizado(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function coordenadaNormalizada(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '0';
  return numero.toFixed(4);
}

function criarChaveAgrupamento(denuncia) {
  return [
    textoNormalizado(denuncia.nome),
    textoNormalizado(denuncia.endereco),
    textoNormalizado(denuncia.cidade),
    coordenadaNormalizada(denuncia.lat),
    coordenadaNormalizada(denuncia.lng)
  ].join('|');
}

function formatarDenunciaSaida(registro) {
  return {
    id: registro.id,
    nome: registro.nome,
    endereco: registro.endereco,
    cidade: registro.cidade,
    lat: registro.lat,
    lng: registro.lng,
    descricao: registro.descricao,
    dataDenuncia: registro.dataDenuncia.toISOString().split('T')[0],
    bandeira: registro.bandeira || undefined,
    foto: registro.foto
  };
}

export async function inicializarDenunciasIniciais() {
  const total = await prismaCliente.denuncia.count();
  if (total > 0) return;

  try {
    const conteudo = await fs.readFile(caminhoArquivoDenuncias, 'utf8');
    const denunciasIniciais = JSON.parse(conteudo);

    if (!Array.isArray(denunciasIniciais) || denunciasIniciais.length === 0) return;

    await prismaCliente.denuncia.createMany({
      data: denunciasIniciais.map((denuncia) => ({
        id: String(denuncia.id),
        nome: String(denuncia.nome),
        endereco: String(denuncia.endereco),
        cidade: String(denuncia.cidade),
        lat: Number(denuncia.lat),
        lng: Number(denuncia.lng),
        descricao: String(denuncia.descricao),
        dataDenuncia: new Date(String(denuncia.dataDenuncia)),
        bandeira: denuncia.bandeira ? String(denuncia.bandeira) : null,
        foto: denuncia.foto ? String(denuncia.foto) : null
      })),
      skipDuplicates: true
    });
  } catch (erro) {
    console.warn('Não foi possível semear denúncias iniciais:', erro);
  }
}

export async function listarDenuncias() {
  const registros = await prismaCliente.denuncia.findMany({
    orderBy: [
      { dataDenuncia: 'desc' },
      { criadoEm: 'desc' }
    ]
  });

  return registros.map(formatarDenunciaSaida);
}

export function agruparDenunciasPorPosto(denuncias) {
  const agrupamento = new Map();

  for (const denuncia of denuncias) {
    const chave = criarChaveAgrupamento(denuncia);
    if (!agrupamento.has(chave)) {
      agrupamento.set(chave, []);
    }
    agrupamento.get(chave).push(denuncia);
  }

  return Array.from(agrupamento.entries()).map(([chave, listaDenuncias]) => {
    // Ordena para garantir que sempre exibimos as denúncias mais recentes primeiro.
    const denunciasOrdenadas = [...listaDenuncias].sort((a, b) => {
      return new Date(b.dataDenuncia).getTime() - new Date(a.dataDenuncia).getTime();
    });

    const denunciaMaisRecente = denunciasOrdenadas[0];

    return {
      idPosto: chave,
      nome: denunciaMaisRecente.nome,
      endereco: denunciaMaisRecente.endereco,
      cidade: denunciaMaisRecente.cidade,
      lat: denunciaMaisRecente.lat,
      lng: denunciaMaisRecente.lng,
      bandeira: denunciaMaisRecente.bandeira,
      foto: denunciaMaisRecente.foto,
      descricaoResumo: denunciaMaisRecente.descricao,
      ultimaDataDenuncia: denunciaMaisRecente.dataDenuncia,
      totalDenuncias: denunciasOrdenadas.length,
      denuncias: denunciasOrdenadas
    };
  });
}

export async function salvarDenuncia(denuncia) {
  const registro = await prismaCliente.denuncia.create({
    data: {
      id: String(denuncia.id),
      nome: String(denuncia.nome),
      endereco: String(denuncia.endereco),
      cidade: String(denuncia.cidade),
      lat: Number(denuncia.lat),
      lng: Number(denuncia.lng),
      descricao: String(denuncia.descricao),
      dataDenuncia: new Date(String(denuncia.dataDenuncia)),
      bandeira: denuncia.bandeira ? String(denuncia.bandeira) : null,
      foto: denuncia.foto ? String(denuncia.foto) : null
    }
  });

  return formatarDenunciaSaida(registro);
}
