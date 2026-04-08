import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, MapPin, Navigation, Radar, X, AlertCircle } from 'lucide-react';
import Mapa, { ResultadoBuscaMapa } from '../components/Mapa';
import { PostoAgrupado } from '../types';
import { calculateDistance } from '../lib/geo';
import { listarPostosAgrupados } from '../lib/apiDenuncias';
import { logosBandeiras } from '../lib/bandeiras';
import logoOutros from '../assets/bandeiras/outro.png';

const RAIO_CIDADES_VIZINHAS_KM = 50;
const ITENS_POR_PAGINA_DENUNCIAS = 9;

export default function Inicio() {
  const secaoListaRef = useRef<HTMLElement>(null);
  const [busca, setBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<ResultadoBuscaMapa[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [exibirSugestoes, setExibirSugestoes] = useState(false);
  const [forcarMapaTelaCheia, setForcarMapaTelaCheia] = useState(false);
  const [filtroCidadeVizinha, setFiltroCidadeVizinha] = useState<[number, number] | null>(null);
  const [postos, setPostos] = useState<PostoAgrupado[]>([]);
  const [carregandoPostos, setCarregandoPostos] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [centroMapa, setCentroMapa] = useState<[number, number]>([-15.7801, -47.9292]);
  const [zoomMapa, setZoomMapa] = useState(4);
  const [localUsuario, setLocalUsuario] = useState<[number, number] | null>(null);
  const [postoSelecionadoId, setPostoSelecionadoId] = useState<string | null>(null);
  const [postoFocoMapa, setPostoFocoMapa] = useState<PostoAgrupado | null>(null);
  const [postoModal, setPostoModal] = useState<PostoAgrupado | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    const carregarPostos = async () => {
      setCarregandoPostos(true);
      setErroCarregamento(null);

      try {
        const postosApi = await listarPostosAgrupados();
        setPostos(postosApi);
      } catch (erro) {
        console.error('Erro ao carregar postos:', erro);
        const mensagemErro = erro instanceof Error ? erro.message : 'Não foi possível carregar as denúncias no momento.';
        setErroCarregamento(mensagemErro);
      } finally {
        setCarregandoPostos(false);
      }
    };

    carregarPostos();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((posicao) => {
        const { latitude, longitude } = posicao.coords;
        setLocalUsuario([latitude, longitude]);
        setCentroMapa([latitude, longitude]);
        setZoomMapa(12);
      });
    }
  }, []);

  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultadosBusca([]);
      setCarregandoSugestoes(false);
      return;
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      setCarregandoSugestoes(true);
      try {
        const consultaPrincipal = `${busca} Brasil`;
        const resposta = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(consultaPrincipal)}`,
          { signal: controlador.signal }
        );
        const dados = await resposta.json();
        let resultados: ResultadoBuscaMapa[] = Array.isArray(dados) ? dados : [];

        if (resultados.length === 0 && !busca.toLowerCase().includes('posto')) {
          const consultaPosto = `posto ${busca} Brasil`;
          const respostaPosto = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(consultaPosto)}`,
            { signal: controlador.signal }
          );
          const dadosPosto = await respostaPosto.json();
          resultados = Array.isArray(dadosPosto) ? dadosPosto : [];
        }

        setResultadosBusca(resultados);
      } catch (erro) {
        if (!(erro instanceof DOMException && erro.name === 'AbortError')) {
          console.error('Erro ao buscar cidades e postos:', erro);
        }
      } finally {
        setCarregandoSugestoes(false);
      }
    }, 350);

    return () => {
      controlador.abort();
      clearTimeout(temporizador);
    };
  }, [busca]);

  const aplicarResultadoBusca = (resultado: ResultadoBuscaMapa) => {
    const latitude = parseFloat(resultado.lat);
    const longitude = parseFloat(resultado.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;

    const nomePrincipal = resultado.display_name.split(',')[0];
    const termoBusca = busca.toLowerCase();
    const resultadoParecePosto = nomePrincipal.toLowerCase().includes('posto');
    const buscaEhCidade = !termoBusca.includes('posto') && !resultadoParecePosto;

    setBusca(nomePrincipal);
    setCentroMapa([latitude, longitude]);
    setZoomMapa(12);
    setFiltroCidadeVizinha(buscaEhCidade ? [latitude, longitude] : null);
    setExibirSugestoes(false);
  };

  const handleBusca = async () => {
    if (!busca) return;

    const primeiroResultado = resultadosBusca[0];
    if (primeiroResultado) {
      aplicarResultadoBusca(primeiroResultado);
      return;
    }

    try {
      const resposta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${busca}, Brasil`)}`);
      const dados = await resposta.json();
      if (dados && dados.length > 0) {
        aplicarResultadoBusca(dados[0] as ResultadoBuscaMapa);
      } else {
        setExibirSugestoes(false);
      }
    } catch (erro) {
      console.error('Erro ao aplicar busca manual:', erro);
      setExibirSugestoes(false);
    }
  };

  const postosFiltrados = useMemo(() => {
    let filtrados = postos;

    if (localUsuario) {
      filtrados = filtrados.filter((posto) => {
        const distancia = calculateDistance(localUsuario[0], localUsuario[1], posto.lat, posto.lng);
        return distancia <= 50;
      });
    }

    if (busca) {
      const buscaNormalizada = busca.toLowerCase();
      if (filtroCidadeVizinha) {
        const [latitudeCidade, longitudeCidade] = filtroCidadeVizinha;
        // Em busca por cidade, inclui também cidades vizinhas por proximidade geográfica.
        filtrados = filtrados.filter((posto) => {
          const distanciaAteCidade = calculateDistance(latitudeCidade, longitudeCidade, posto.lat, posto.lng);
          return distanciaAteCidade <= RAIO_CIDADES_VIZINHAS_KM;
        });
      } else {
        filtrados = filtrados.filter((posto) => {
          return (
            posto.cidade.toLowerCase().includes(buscaNormalizada) ||
            posto.nome.toLowerCase().includes(buscaNormalizada) ||
            posto.endereco.toLowerCase().includes(buscaNormalizada)
          );
        });
      }
    }

    return filtrados;
  }, [postos, busca, localUsuario, filtroCidadeVizinha]);

  const totalPaginas = Math.max(1, Math.ceil(postosFiltrados.length / ITENS_POR_PAGINA_DENUNCIAS));

  const postosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA_DENUNCIAS;
    const fim = inicio + ITENS_POR_PAGINA_DENUNCIAS;
    return postosFiltrados.slice(inicio, fim);
  }, [postosFiltrados, paginaAtual]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroCidadeVizinha]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const verNoMapa = (posto: PostoAgrupado) => {
    setCentroMapa([posto.lat, posto.lng]);
    setZoomMapa(16);
    setPostoSelecionadoId(posto.idPosto);
    setPostoFocoMapa(posto);
    setForcarMapaTelaCheia(true);
  };

  const obterLogoBandeira = (bandeira?: string) => {
    const bandeiraNormalizada = (bandeira || '').toLowerCase().trim();
    if (!bandeiraNormalizada || bandeiraNormalizada === 'outros') {
      return logoOutros;
    }
    return logosBandeiras[bandeiraNormalizada as keyof typeof logosBandeiras] || null;
  };

  const abrirMapaTelaCheia = () => {
    setPostoSelecionadoId(null);
    setPostoFocoMapa(null);
    // Requisita a localização no clique para priorizar o ponto atual ao abrir o mapa.
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((posicao) => {
        const { latitude, longitude } = posicao.coords;
        setLocalUsuario([latitude, longitude]);
        setCentroMapa([latitude, longitude]);
        setZoomMapa(16);
        setForcarMapaTelaCheia(true);
      }, () => {
        setForcarMapaTelaCheia(true);
      });
      return;
    }
    setForcarMapaTelaCheia(true);
  };

  const rolarParaTopoDaLista = () => {
    secaoListaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark">
      <section className="relative z-[700] min-h-[60vh] flex items-center justify-center px-4 pt-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,30,30,0.24)_0%,rgba(120,0,0,0.18)_28%,rgba(15,0,0,0.92)_62%,#050505_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,30,30,0.18)_0%,rgba(255,30,30,0.05)_32%,transparent_62%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.45)_30%,rgba(0,0,0,0.82)_100%)]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-soft-light" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-brand-dark/95" />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto text-center relative z-10"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 bg-brand-red/10 text-brand-red px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-brand-red/20 mb-6 backdrop-blur-md"
          >
            <Radar className="w-3 h-3 animate-pulse" />
            Radar Ativo
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mb-6"
          >
            <img src="/images/logo.png" alt="PostoSujo" className="h-44 sm:h-72 md:h-[28rem] w-auto mx-auto object-contain drop-shadow-[0_0_30px_rgba(255,30,30,0.3)]" />
          </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-base sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-medium mb-12 px-4"
        >
          A maior rede colaborativa de combate à fraude de combustíveis no Brasil, incluindo dados oficiais da ANP. Você está sendo prejudicado, não se cale e divulge!
        </motion.p>

          <motion.button
            variants={itemVariants}
            type="button"
            onClick={abrirMapaTelaCheia}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-brand-red/25 hover:bg-red-500 active:scale-95 transition-all"
          >
            <Navigation className="w-5 h-5" />
            Abrir mapa
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Explorar Mapa</span>
        </motion.div>
      </section>

      <section ref={secaoListaRef} className="pt-4 pb-24 px-4 bg-brand-dark relative z-[500] mt-8 sm:mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-24">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-brand-red text-xs font-black uppercase tracking-[0.3em]">
                <Radar className="w-4 h-4" />
                Feed de Ocorrências 2025-2026
              </div>
              <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase italic">
                Denúncias <span className="text-brand-red">Recentes</span>
              </h2>
            </div>

            <div className="flex gap-4">
              <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 bg-brand-red rounded-full animate-ping" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Ao Vivo</span>
              </div>
            </div>
          </div>

          {erroCarregamento && (
            <div className="mb-8 bg-red-500/10 text-red-300 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{erroCarregamento}</p>
            </div>
          )}

          {carregandoPostos ? (
            <div className="text-center py-24 glass-panel rounded-[3rem]">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Carregando denúncias...</h3>
              <p className="text-white/40 font-medium">Buscando dados da API.</p>
            </div>
          ) : postosFiltrados.length > 0 ? (
            <>
              <motion.div
                key={`pagina-${paginaAtual}`}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {postosPaginados.map((posto) => (
                  <motion.div
                    key={posto.idPosto}
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="group relative bg-brand-surface border border-white/5 rounded-[2rem] overflow-hidden hover:border-brand-red/30 transition-all duration-500"
                  >
                  <div className="aspect-[16/5] relative overflow-hidden">
                    {posto.foto ? (
                      <img
                        src={posto.foto}
                        alt={posto.nome}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-dark flex items-center justify-center">
                        {obterLogoBandeira(posto.bandeira) ? (
                          <img
                            src={obterLogoBandeira(posto.bandeira) || undefined}
                            alt={`Fundo ${posto.bandeira}`}
                            className="w-24 h-24 object-contain opacity-25 group-hover:opacity-35 transition-opacity"
                          />
                        ) : null}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />

                    <div className="absolute top-4 left-4">
                      {obterLogoBandeira(posto.bandeira) ? (
                        <div className="bg-brand-red/90 text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5">
                          <img
                            src={obterLogoBandeira(posto.bandeira) || undefined}
                            alt={`Logo ${posto.bandeira}`}
                            className="w-4 h-4 rounded-full bg-white object-contain p-[1px]"
                          />
                          {posto.bandeira}
                        </div>
                      ) : (
                        <div className="bg-brand-red text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl">
                          {posto.bandeira || 'Sem Bandeira'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-white group-hover:text-brand-red transition-colors line-clamp-1 uppercase italic tracking-tight">
                        {posto.nome}
                      </h3>
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                        <MapPin className="w-3 h-3 text-brand-red" />
                        {posto.cidade}
                      </div>
                    </div>

                    <div className="bg-brand-dark/50 p-4 rounded-2xl border border-white/5 group-hover:border-brand-red/10 transition-colors">
                      <p className="text-xs text-white/60 line-clamp-2 leading-relaxed font-medium">
                        {posto.descricaoResumo}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Última denúncia</span>
                        <span className="text-[10px] font-bold text-white/60">{new Date(posto.ultimaDataDenuncia).toLocaleDateString('pt-BR')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {posto.totalDenuncias > 1 && (
                          <button
                            onClick={() => setPostoModal(posto)}
                            className="px-3 py-2 text-[10px] bg-brand-red/10 text-brand-red rounded-xl hover:bg-brand-red hover:text-white transition-all border border-brand-red/30 font-black uppercase tracking-wider"
                          >
                            Ver {posto.totalDenuncias} denúncias
                          </button>
                        )}
                        <button
                          onClick={() => verNoMapa(posto)}
                          className="p-3 bg-white/5 text-white rounded-xl hover:bg-brand-red transition-all active:scale-90 border border-white/5 group/btn"
                        >
                          <Navigation className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                  </motion.div>
                ))}
              </motion.div>

              {postosFiltrados.length > ITENS_POR_PAGINA_DENUNCIAS && (
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      setPaginaAtual((anterior) => {
                        const proximaPagina = Math.max(1, anterior - 1);
                        if (proximaPagina !== anterior) rolarParaTopoDaLista();
                        return proximaPagina;
                      });
                    }}
                    disabled={paginaAtual === 1}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>

                  <p className="text-[11px] text-white/50 font-black uppercase tracking-widest">
                    Página {paginaAtual} de {totalPaginas}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setPaginaAtual((anterior) => {
                        const proximaPagina = Math.min(totalPaginas, anterior + 1);
                        if (proximaPagina !== anterior) rolarParaTopoDaLista();
                        return proximaPagina;
                      });
                    }}
                    disabled={paginaAtual === totalPaginas}
                    className="px-4 py-2 rounded-xl border border-brand-red/40 bg-brand-red/10 text-xs font-black uppercase tracking-widest text-brand-red hover:bg-brand-red hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 glass-panel rounded-[3rem]">
              <div className="bg-brand-red/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-red/20">
                <Search className="w-8 h-8 text-brand-red" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Nenhum posto encontrado</h3>
              <p className="text-white/40 font-medium">Tente buscar por outra cidade ou limpe os filtros.</p>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {postoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setPostoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl bg-brand-surface border border-white/10"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic leading-tight">{postoModal.nome}</h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{postoModal.totalDenuncias} denúncias registradas</p>
                </div>
                <button
                  onClick={() => setPostoModal(null)}
                  className="p-2 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(85vh-110px)] space-y-4">
                {postoModal.denuncias.map((denuncia) => (
                  <div key={denuncia.id} className="bg-brand-dark/60 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-widest text-brand-red font-black">{denuncia.bandeira || 'Sem bandeira'}</span>
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                        {new Date(denuncia.dataDenuncia).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{denuncia.descricao}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {forcarMapaTelaCheia && (
        <Mapa
          postos={postosFiltrados}
          center={centroMapa}
          zoom={zoomMapa}
          showUserLocation={true}
          selectedPostoId={postoSelecionadoId}
          postoFoco={postoFocoMapa}
          forcarTelaCheia={forcarMapaTelaCheia}
          aoAlterarTelaCheia={setForcarMapaTelaCheia}
          buscaMapa={busca}
          carregandoSugestoes={carregandoSugestoes}
          exibirSugestoes={exibirSugestoes}
          resultadosBusca={resultadosBusca}
          aoEnviarBuscaMapa={handleBusca}
          aoMudarBuscaMapa={(valor) => {
            setBusca(valor);
            setFiltroCidadeVizinha(null);
          }}
          aoAlterarExibicaoSugestoes={setExibirSugestoes}
          aoSelecionarResultadoBusca={aplicarResultadoBusca}
        />
      )}
    </div>
  );
}
