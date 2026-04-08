import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { PostoAgrupado } from '../types';
import { Search, Plus, Minus, Navigation, Maximize, Minimize, X } from 'lucide-react';
import { logosBandeiras } from '../lib/bandeiras';
import { useNavigate } from 'react-router-dom';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const RedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function normalizarBandeiraPosto(bandeira?: string) {
  return (bandeira || '').trim().toLowerCase();
}

function inferirBandeiraPeloNome(nomePosto?: string) {
  if (!nomePosto) return null;

  // Inferência para preservar o visual anterior quando a API salva "outros".
  const nomeNormalizado = nomePosto.toLowerCase();
  if (nomeNormalizado.includes('ipiranga')) return 'ipiranga';
  if (nomeNormalizado.includes('petrobras') || nomeNormalizado.includes('br distribuidora') || /\bposto br\b/.test(nomeNormalizado)) return 'petrobras';
  if (nomeNormalizado.includes('shell')) return 'shell';
  if (nomeNormalizado.includes('ale')) return 'ale';
  if (nomeNormalizado.includes('rodoil')) return 'rodoil';
  if (nomeNormalizado.includes('texaco')) return 'texaco';
  if (nomeNormalizado.includes('vibra')) return 'vibra';
  if (nomeNormalizado.includes('potencial')) return 'potencial';
  if (nomeNormalizado.includes('santa lucia') || nomeNormalizado.includes('santa lúcia')) return 'santa_lucia';
  if (/\bposto sim\b/.test(nomeNormalizado) || /\bsim\b/.test(nomeNormalizado)) return 'sim';
  return null;
}

const getIcon = (bandeira?: string, nomePosto?: string) => {
  const bandeiraNormalizada = normalizarBandeiraPosto(bandeira);
  const chaveBandeira = (
    (bandeiraNormalizada && bandeiraNormalizada !== 'outros' ? bandeiraNormalizada : null) ||
    inferirBandeiraPeloNome(nomePosto)
  );

  if (!chaveBandeira || !logosBandeiras[chaveBandeira as keyof typeof logosBandeiras]) return RedIcon;
  
  // Create a custom div icon to show the logo inside a pin-like shape
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex flex-col items-center">
        <div class="w-10 h-10 bg-white rounded-full border-2 border-red-600 shadow-lg flex items-center justify-center overflow-hidden p-1">
          <img src="${logosBandeiras[chaveBandeira as keyof typeof logosBandeiras]}" class="w-full h-full object-contain" />
        </div>
        <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600 -mt-1 shadow-sm"></div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48]
  });
};

interface MapaProps {
  postos: PostoAgrupado[];
  onMapClick?: (lat: number, lng: number) => void;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  showUserLocation?: boolean;
  selectedPostoId?: string | null;
  postoFoco?: PostoAgrupado | null;
  forcarTelaCheia?: boolean;
  aoAlterarTelaCheia?: (ativo: boolean) => void;
  buscaMapa?: string;
  carregandoSugestoes?: boolean;
  exibirSugestoes?: boolean;
  resultadosBusca?: ResultadoBuscaMapa[];
  aoEnviarBuscaMapa?: () => void;
  aoMudarBuscaMapa?: (valor: string) => void;
  aoAlterarExibicaoSugestoes?: (ativo: boolean) => void;
  aoSelecionarResultadoBusca?: (resultado: ResultadoBuscaMapa) => void;
}

export interface ResultadoBuscaMapa {
  display_name: string;
  lat: string;
  lon: string;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && 
        typeof center[0] === 'number' && typeof center[1] === 'number' &&
        !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom, {
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
  return null;
}

function MapEvents({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    const onLocationFound = (e: L.LocationEvent) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    };

    map.locate().on("locationfound", onLocationFound);
    
    return () => {
      map.off("locationfound", onLocationFound);
    };
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={RedIcon}>
      <Popup>Você está aqui</Popup>
    </Marker>
  );
}

// Custom Controls Component
function CustomControls({ isFullscreen, toggleFullscreen }: { isFullscreen: boolean, toggleFullscreen: () => void }) {
  const map = useMap();

  const handleLocate = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        map.flyTo([position.coords.latitude, position.coords.longitude], 16, {
          duration: 1.5
        });
      }, (error) => {
        console.error("Erro ao obter localização:", error);
      });
    }
  };

  return (
    <div className="absolute bottom-20 sm:bottom-24 right-4 z-[10000] flex flex-col gap-2">
      <div className="flex flex-col bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
        <button 
          onClick={() => map.zoomIn()}
          className="p-3 hover:bg-slate-50 text-slate-700 transition-colors border-b border-slate-100"
          title="Aumentar Zoom"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button 
          onClick={() => map.zoomOut()}
          className="p-3 hover:bg-slate-50 text-slate-700 transition-colors"
          title="Diminuir Zoom"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
      
      <button 
        onClick={handleLocate}
        className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xl transition-all active:scale-95 flex items-center justify-center"
        title="Meu Local"
      >
        <Navigation className="w-5 h-5" />
      </button>

      <button 
        onClick={toggleFullscreen}
        className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-xl transition-all active:scale-95 flex items-center justify-center border border-slate-200"
        title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>
    </div>
  );
}

// Component to handle initial location on mount
function InitialLocation({ center }: { center: [number, number] }) {
  const map = useMap();
  const [hasLocated, setHasLocated] = useState(false);

  useEffect(() => {
    // Only auto-locate if we are at the default center
    if (!hasLocated && center && !isNaN(center[0]) && center[0] === -15.7801 && center[1] === -47.9292) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          if (!isNaN(latitude) && !isNaN(longitude)) {
            map.setView([latitude, longitude], 16);
            setHasLocated(true);
          }
        }, (error) => {
          console.warn("Geolocation error:", error);
        });
      }
    }
  }, [map, center, hasLocated]);

  return null;
}

function MapSettingsUpdater({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    try {
      if (isFullscreen) {
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
      } else {
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
      }
      
      // Crucial for Leaflet when container size changes
      // Use requestAnimationFrame for smoother transition and to ensure DOM is ready
      const timer = setTimeout(() => {
        if (map && map.invalidateSize) {
          map.invalidateSize();
        }
      }, 200);
      
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn("MapSettingsUpdater error:", e);
    }
  }, [map, isFullscreen]);
  return null;
}

function MarkerWithPopup({
  posto,
  isSelected,
  aoDenunciarNoMesmoLocal,
  aoVerOutrasDenuncias
}: {
  posto: PostoAgrupado,
  isSelected: boolean,
  aoDenunciarNoMesmoLocal: (posto: PostoAgrupado) => void,
  aoVerOutrasDenuncias: (posto: PostoAgrupado) => void,
  key?: string
}) {
  const markerRef = React.useRef<L.Marker>(null);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  return (
    <Marker 
      position={[posto.lat, posto.lng]} 
      icon={getIcon(posto.bandeira, posto.nome)}
      ref={markerRef}
    >
      <Popup>
        <div className="p-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-black text-slate-900 text-sm">{posto.nome}</h3>
            {posto.bandeira && (
              <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 uppercase font-black text-slate-500 tracking-wider">
                {posto.bandeira}
              </span>
            )}
          </div>
          
          {posto.foto && (
            <div className="mb-3 rounded-xl overflow-hidden aspect-video border border-slate-100 shadow-sm">
              <img src={posto.foto} alt={`Fachada ${posto.nome}`} className="w-full h-full object-cover" />
            </div>
          )}
          
          <p className="text-[11px] text-slate-500 mb-3 font-medium leading-tight">{posto.endereco}</p>
          
          <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 mb-3">
            <p className="text-[11px] leading-relaxed">
              <strong className="font-black uppercase text-[9px] tracking-widest block mb-1">Denúncia:</strong> 
              {posto.descricaoResumo}
            </p>
          </div>

          {posto.totalDenuncias > 1 && (
            <div className="mb-2">
              <p className="text-[10px] font-bold text-red-700 mb-2">
                Total de denúncias: {posto.totalDenuncias}
              </p>
              <button
                type="button"
                onClick={() => aoVerOutrasDenuncias(posto)}
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-700 transition-colors hover:bg-red-50"
              >
                Ver Outras Denúncias
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              Relatado em: {new Date(posto.ultimaDataDenuncia).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => aoDenunciarNoMesmoLocal(posto)}
            className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-red-700"
          >
            Denunciar Neste Local
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

function MarkerFocoPosto({ posto }: { posto: PostoAgrupado }) {
  const referenciaMarker = React.useRef<L.Marker>(null);

  useEffect(() => {
    if (referenciaMarker.current) {
      referenciaMarker.current.openPopup();
    }
  }, [posto.idPosto]);

  return (
    <Marker position={[posto.lat, posto.lng]} icon={RedIcon} ref={referenciaMarker}>
      <Popup>
        <div className="min-w-[180px] space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Posto selecionado</p>
          <h4 className="text-sm font-black text-slate-900">{posto.nome}</h4>
          <p className="text-[11px] text-slate-600 leading-tight">{posto.endereco}</p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function Mapa({
  postos,
  onMapClick,
  center = [-15.7801, -47.9292],
  zoom = 4,
  interactive = true,
  showUserLocation = false,
  selectedPostoId = null,
  postoFoco = null,
  forcarTelaCheia = false,
  aoAlterarTelaCheia,
  buscaMapa = '',
  carregandoSugestoes = false,
  exibirSugestoes = false,
  resultadosBusca = [],
  aoEnviarBuscaMapa,
  aoMudarBuscaMapa,
  aoAlterarExibicaoSugestoes,
  aoSelecionarResultadoBusca
}: MapaProps) {
  const [isFullscreen, setIsFullscreen] = useState(forcarTelaCheia);
  const [ehDesktop, setEhDesktop] = useState(false);
  const [buscaExpandida, setBuscaExpandida] = useState(false);
  const [postoModalDenuncias, setPostoModalDenuncias] = useState<PostoAgrupado | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const navegar = useNavigate();
  const totalDenunciasNaRegiao = useMemo(() => {
    return postos.reduce((acumulador, posto) => acumulador + (posto.totalDenuncias || 0), 0);
  }, [postos]);

  const montarLinkDenunciaMesmoLocal = useCallback((posto: PostoAgrupado) => {
    // Mantemos os dados essenciais no query string para pré-preencher o formulário.
    const parametros = new URLSearchParams({
      nome: posto.nome || '',
      endereco: posto.endereco || '',
      cidade: posto.cidade || '',
      lat: String(posto.lat),
      lng: String(posto.lng),
      bandeira: posto.bandeira || 'outros'
    });
    return `/denunciar?${parametros.toString()}`;
  }, []);

  const denunciarNoMesmoLocal = useCallback((posto: PostoAgrupado) => {
    navegar(montarLinkDenunciaMesmoLocal(posto));
  }, [montarLinkDenunciaMesmoLocal, navegar]);

  const abrirModalOutrasDenuncias = useCallback((posto: PostoAgrupado) => {
    setPostoModalDenuncias(posto);
  }, []);

  const fecharModalOutrasDenuncias = useCallback(() => {
    setPostoModalDenuncias(null);
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen((estadoAnterior) => !estadoAnterior);
  };

  useEffect(() => {
    setIsFullscreen(forcarTelaCheia);
  }, [forcarTelaCheia]);

  useEffect(() => {
    const atualizarModoDesktop = () => {
      setEhDesktop(window.innerWidth >= 1024);
    };

    atualizarModoDesktop();
    window.addEventListener('resize', atualizarModoDesktop);
    return () => window.removeEventListener('resize', atualizarModoDesktop);
  }, []);

  useEffect(() => {
    aoAlterarTelaCheia?.(isFullscreen);
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setBuscaExpandida(false);
      aoAlterarExibicaoSugestoes?.(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen, aoAlterarTelaCheia, aoAlterarExibicaoSugestoes]);

  const validCenter: [number, number] = (center && !isNaN(center[0]) && !isNaN(center[1])) 
    ? center 
    : [-15.7801, -47.9292];

  const mapaInterno = (
    <div 
      ref={mapRef}
      className={`relative transition-all duration-500 ease-in-out ${
        isFullscreen && !ehDesktop
          ? 'fixed inset-0 z-[300000] w-screen h-screen bg-brand-dark flex flex-col' 
          : isFullscreen && ehDesktop
            ? 'h-full w-full bg-brand-dark flex flex-col rounded-[2rem] overflow-hidden border border-white/15 shadow-2xl'
            : 'h-[600px] bg-slate-100 w-full'
      }`}
      style={isFullscreen && !ehDesktop ? { top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' } : {}}
    >
      {isFullscreen && (
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 z-[100001] flex justify-between items-start gap-3 pointer-events-none">
          <div className="pointer-events-auto flex items-start gap-3">
            <div className="glass-panel px-4 py-3 sm:px-6 rounded-2xl flex items-center gap-3 shadow-2xl border-white/20">
              <div className="w-2 h-2 bg-brand-red rounded-full animate-ping" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white italic">Radar em Tempo Real</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const proximoEstado = !buscaExpandida;
                  setBuscaExpandida(proximoEstado);
                  if (!proximoEstado) aoAlterarExibicaoSugestoes?.(false);
                }}
                className="h-12 w-12 rounded-2xl bg-brand-red text-white shadow-2xl hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center"
                title="Buscar cidade ou posto"
              >
                <Search className="w-5 h-5" />
              </button>

              {buscaExpandida && (
                <form
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    aoEnviarBuscaMapa?.();
                  }}
                  className="absolute top-0 left-14 w-[min(80vw,360px)]"
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cidade ou posto"
                      value={buscaMapa}
                      onChange={(evento) => {
                        aoMudarBuscaMapa?.(evento.target.value);
                        aoAlterarExibicaoSugestoes?.(true);
                      }}
                      onFocus={() => aoAlterarExibicaoSugestoes?.(true)}
                      onBlur={() => {
                        setTimeout(() => aoAlterarExibicaoSugestoes?.(false), 120);
                      }}
                      className="w-full h-12 pl-4 pr-12 rounded-2xl bg-brand-surface/95 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-brand-red"
                    />
                    <button
                      type="submit"
                      className="absolute right-1 top-1 h-10 w-10 rounded-xl bg-brand-red text-white hover:bg-red-500 transition-colors flex items-center justify-center"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {exibirSugestoes && buscaMapa.trim().length >= 2 && (
                    <div className="mt-2 bg-brand-surface/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl text-left shadow-2xl">
                      {carregandoSugestoes ? (
                        <p className="px-4 py-3 text-xs text-white/60 font-bold uppercase tracking-wider">Buscando...</p>
                      ) : resultadosBusca.length > 0 ? (
                        resultadosBusca.map((resultado, indice) => (
                          <button
                            key={`${resultado.display_name}-${indice}`}
                            type="button"
                            onMouseDown={(evento) => {
                              evento.preventDefault();
                              aoSelecionarResultadoBusca?.(resultado);
                              setBuscaExpandida(false);
                            }}
                            className="w-full px-4 py-3 border-b last:border-b-0 border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <p className="text-sm font-bold text-white line-clamp-1">{resultado.display_name.split(',')[0]}</p>
                            <p className="text-[11px] text-white/40 line-clamp-1">{resultado.display_name}</p>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-xs text-white/50 font-bold uppercase tracking-wider">Nenhuma sugestão encontrada.</p>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="p-4 bg-brand-red text-white rounded-2xl shadow-2xl hover:bg-red-500 active:scale-95 transition-all pointer-events-auto flex items-center gap-2 font-black uppercase tracking-widest text-xs"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Sair da Tela Cheia</span>
          </button>
        </div>
      )}

      {isFullscreen && (
        <div className="absolute top-[4.5rem] left-4 sm:top-[5.75rem] sm:left-6 z-[100001] pointer-events-none">
          <div className="glass-panel px-4 py-2.5 rounded-xl border border-white/15 shadow-2xl">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/70">
              Denúncias na região
            </p>
            <p className="text-lg sm:text-xl font-black text-brand-red leading-none mt-1">
              {totalDenunciasNaRegiao}
            </p>
          </div>
        </div>
      )}

      <MapContainer 
        center={validCenter} 
        zoom={zoom} 
        scrollWheelZoom={false} 
        doubleClickZoom={false}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ChangeView center={validCenter} zoom={zoom} />
        <MapSettingsUpdater isFullscreen={isFullscreen} />
        <InitialLocation center={validCenter} />
        {interactive && <MapEvents onClick={onMapClick} />}
        {showUserLocation && <LocationMarker />}
        {postoFoco && <MarkerFocoPosto posto={postoFoco} />}
        
        <CustomControls isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />
        
        {postos.filter(p => p.lat !== undefined && p.lng !== undefined && !isNaN(p.lat) && !isNaN(p.lng)).map((posto) => (
          <MarkerWithPopup 
            key={posto.idPosto} 
            posto={posto} 
            isSelected={selectedPostoId === posto.idPosto} 
            aoDenunciarNoMesmoLocal={denunciarNoMesmoLocal}
            aoVerOutrasDenuncias={abrirModalOutrasDenuncias}
          />
        ))}
      </MapContainer>

      {postoModalDenuncias && (
        <div
          className="absolute inset-0 z-[400000] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={fecharModalOutrasDenuncias}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-brand-surface border border-white/10"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white uppercase italic leading-tight">
                  {postoModalDenuncias.nome}
                </h3>
                <p className="text-[10px] sm:text-xs text-white/40 font-bold uppercase tracking-widest">
                  {postoModalDenuncias.totalDenuncias} denúncias registradas
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModalOutrasDenuncias}
                className="p-2 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                aria-label="Fechar modal de denúncias"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-92px)] space-y-3">
              {postoModalDenuncias.denuncias.map((denuncia) => (
                <div key={denuncia.id} className="bg-brand-dark/60 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-brand-red font-black">
                      {denuncia.bandeira || 'Sem bandeira'}
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                      {new Date(denuncia.dataDenuncia).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{denuncia.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const mapContent = isFullscreen && ehDesktop ? (
    <div
      className="fixed inset-0 z-[300000] bg-black/75 backdrop-blur-sm p-6 lg:p-10 flex items-center justify-center"
      onClick={toggleFullscreen}
    >
      <div
        className="w-full h-full max-w-[1400px] max-h-[92vh]"
        onClick={(evento) => evento.stopPropagation()}
      >
        {mapaInterno}
      </div>
    </div>
  ) : mapaInterno;

  if (isFullscreen) {
    return createPortal(mapContent, document.body);
  }

  return mapContent;
}
