export type BandeiraPosto =
  | 'ipiranga'
  | 'petrobras'
  | 'shell'
  | 'ale'
  | 'rodoil'
  | 'texaco'
  | 'sim'
  | 'branca'
  | 'potencial'
  | 'santa_lucia'
  | 'outros';

export interface Denuncia {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  lat: number;
  lng: number;
  descricao: string;
  dataDenuncia: string;
  bandeira?: BandeiraPosto;
  foto?: string | null;
}

export interface PostoAgrupado {
  idPosto: string;
  nome: string;
  endereco: string;
  cidade: string;
  lat: number;
  lng: number;
  descricaoResumo: string;
  ultimaDataDenuncia: string;
  bandeira?: BandeiraPosto;
  foto?: string | null;
  totalDenuncias: number;
  denuncias: Denuncia[];
}

export interface CriarDenunciaPayload {
  nome: string;
  endereco: string;
  cidade: string;
  lat: number;
  lng: number;
  descricao: string;
  bandeira?: BandeiraPosto;
  foto?: string | null;
  dataDenuncia?: string;
}
