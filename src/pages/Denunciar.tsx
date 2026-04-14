import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, MapPin, Send, CheckCircle2, Info, Search, Loader2, X, ChevronRight, ChevronLeft, Radar, Navigation } from 'lucide-react';
import Mapa from '../components/Mapa';
import { BandeiraPosto } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { criarDenuncia } from '../lib/apiDenuncias';
import { logosBandeiras } from '../lib/bandeiras';
import SeoPagina from '../components/SeoPagina';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

export default function Denunciar() {
  const navigate = useNavigate();
  const [parametrosBusca] = useSearchParams();
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    cidade: '',
    descricao: '',
    bandeira: 'outros',
    lat: 0,
    lng: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    const nome = parametrosBusca.get('nome')?.trim() || '';
    const endereco = parametrosBusca.get('endereco')?.trim() || '';
    const cidade = parametrosBusca.get('cidade')?.trim() || '';
    const bandeira = parametrosBusca.get('bandeira')?.trim() || 'outros';
    const latitude = Number(parametrosBusca.get('lat'));
    const longitude = Number(parametrosBusca.get('lng'));

    const temCoordenadasValidas = Number.isFinite(latitude) && Number.isFinite(longitude);
    const temDadosParaPreencher = Boolean(nome || endereco || cidade || temCoordenadasValidas);

    if (!temDadosParaPreencher) return;

    // Quando a denúncia nasce do popup do mapa, já iniciamos no passo 2.
    setFormData((anterior) => ({
      ...anterior,
      nome: nome || anterior.nome,
      endereco: endereco || anterior.endereco,
      cidade: cidade || anterior.cidade,
      bandeira: bandeira || anterior.bandeira,
      lat: temCoordenadasValidas ? latitude : anterior.lat,
      lng: temCoordenadasValidas ? longitude : anterior.lng
    }));

    setStep(2);
  }, [parametrosBusca]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    
    setIsSearching(true);
    setSearchResults([]);
    try {
      const query = `${searchTerm} Brasil`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
      
      if (data.length === 0) {
        if (!searchTerm.toLowerCase().includes('posto')) {
          const retryResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent('posto ' + searchTerm + ' Brasil')}`);
          const retryData = await retryResponse.json();
          setSearchResults(retryData);
        }
      }
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lng)) return;

    const city = result.address.city || result.address.town || result.address.village || result.address.state || '';
    const name = result.display_name.split(',')[0];

    let detectedBandeira = 'outros';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('ipiranga')) detectedBandeira = 'ipiranga';
    else if (lowerName.includes('petrobras') || lowerName.includes('br')) detectedBandeira = 'petrobras';
    else if (lowerName.includes('shell')) detectedBandeira = 'shell';
    else if (lowerName.includes('ale')) detectedBandeira = 'ale';
    else if (lowerName.includes('rodoil')) detectedBandeira = 'rodoil';
    else if (lowerName.includes('texaco')) detectedBandeira = 'texaco';
    else if (lowerName.includes('posto sim') || /\bsim\b/.test(lowerName)) detectedBandeira = 'sim';

    setFormData({
      ...formData,
      lat,
      lng,
      endereco: result.display_name,
      cidade: city,
      nome: name,
      bandeira: detectedBandeira
    });
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, lat, lng }));
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data) {
        const address = data.display_name;
        const city = data.address.city || data.address.town || data.address.village || '';
        setFormData(prev => ({ 
          ...prev, 
          endereco: address,
          cidade: city
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await criarDenuncia({
        nome: formData.nome,
        endereco: formData.endereco,
        cidade: formData.cidade,
        lat: formData.lat,
        lng: formData.lng,
        descricao: formData.descricao,
        bandeira: formData.bandeira as BandeiraPosto
      });

      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (erro) {
      console.error('Erro ao cadastrar denúncia:', erro);
      setIsSubmitting(false);
      alert('Não foi possível enviar sua denúncia agora. Tente novamente em instantes.');
    }
  };

  if (success) {
    return (
      <>
        <SeoPagina
          titulo="Denunciar Posto | PostoSujo"
          descricao="Registre uma denúncia de posto com combustível adulterado de forma rápida e colaborativa para fortalecer a segurança de outros motoristas."
          caminho="/denunciar"
          palavrasChave="denunciar posto, combustível adulterado, gasolina batizada, denúncia colaborativa"
        />
        <div className="flex-1 flex items-center justify-center p-4 bg-brand-dark">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel p-12 rounded-[3rem] text-center max-w-md w-full shadow-2xl shadow-brand-red/10"
          >
            <div className="bg-brand-red/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-brand-red/30">
              <CheckCircle2 className="text-brand-red w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tight">Denúncia Enviada!</h2>
            <p className="text-white/60 mb-8 font-medium">Obrigado por ajudar a manter nossa comunidade informada e protegida.</p>
            <div className="flex items-center justify-center gap-3 text-brand-red">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest">Voltando ao Radar...</span>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <SeoPagina
        titulo="Denunciar Posto | PostoSujo"
        descricao="Registre uma denúncia de posto com combustível adulterado de forma rápida e colaborativa para fortalecer a segurança de outros motoristas."
        caminho="/denunciar"
        palavrasChave="denunciar posto, combustível adulterado, gasolina batizada, denúncia colaborativa"
      />
      <div className="flex-1 bg-brand-dark py-12 sm:py-24 px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,rgba(255,30,30,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-16 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-brand-red text-xs font-black uppercase tracking-[0.3em]"
          >
            <AlertTriangle className="w-4 h-4" />
            Canal de Denúncias
          </motion.div>
          <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
            Relatar <span className="text-brand-red">Irregularidade</span>
          </h1>
          <p className="text-white/40 max-w-2xl mx-auto font-medium">
            Siga o protocolo de segurança para registrar uma nova ocorrência no sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Steps Indicator - Desktop Sidebar / Mobile Progress Bar */}
          <div className="lg:col-span-3">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block space-y-4">
              {[
                { n: 1, t: 'Localização', d: 'Ponto de Origem' },
                { n: 2, t: 'Identidade', d: 'Nome e Bandeira' },
                { n: 3, t: 'Relatório', d: 'Detalhamento' }
              ].map((s) => (
                <motion.div 
                  key={s.n}
                  whileHover={{ x: 5 }}
                  className={`p-6 rounded-3xl border transition-all relative overflow-hidden group ${
                    step === s.n 
                      ? 'bg-brand-red/10 border-brand-red/30 shadow-xl shadow-brand-red/5' 
                      : 'bg-white/5 border-white/5 opacity-40 grayscale'
                  }`}
                >
                  {step === s.n && (
                    <motion.div 
                      layoutId="step-glow"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red"
                    />
                  )}
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                      step === s.n ? 'bg-brand-red text-white' : 'bg-white/10 text-white/30'
                    }`}>
                      {s.n}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-white text-sm uppercase tracking-widest">{s.t}</h3>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{s.d}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Mobile Progress Bar */}
            <div className="lg:hidden mb-8">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <span className="text-brand-red text-xs font-black uppercase tracking-widest">Passo {step} de 3</span>
                  <h3 className="text-white font-black uppercase italic">
                    {step === 1 && 'Localização'}
                    {step === 2 && 'Identidade'}
                    {step === 3 && 'Relatório'}
                  </h3>
                </div>
                <div className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                  {Math.round((step / 3) * 100)}% concluído
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 3) * 100}%` }}
                  className="h-full bg-brand-red shadow-[0_0_10px_rgba(255,30,30,0.5)]"
                />
              </div>
            </div>

            <div className="hidden lg:block bg-brand-red/5 p-6 rounded-[2rem] border border-brand-red/10 mt-12">
              <div className="flex gap-4">
                <Info className="text-brand-red w-5 h-5 shrink-0" />
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest leading-relaxed">
                  Sua denúncia é 100% anônima e criptografada.
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-9">
            <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl">
              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-6 sm:p-12 space-y-8 sm:space-y-10"
                    >
                      <div className="space-y-6 sm:space-y-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Search className="w-4 h-4 text-brand-red" />
                              Localizar Posto
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if ("geolocation" in navigator) {
                                  navigator.geolocation.getCurrentPosition((pos) => {
                                    handleMapClick(pos.coords.latitude, pos.coords.longitude);
                                  });
                                }
                              }}
                              className="text-[10px] font-black text-brand-red uppercase tracking-widest flex items-center gap-1 hover:text-white transition-colors"
                            >
                              <Navigation className="w-3 h-3" />
                              Usar meu local
                            </button>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                placeholder="Digite o nome ou endereço..."
                                className="w-full pl-6 pr-6 py-5 sm:py-6 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-brand-red focus:bg-white/10 outline-none transition-all text-white font-bold placeholder:text-white/20 text-sm sm:text-base"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSearch}
                              disabled={isSearching}
                              className="px-8 sm:px-10 py-5 sm:py-6 bg-white text-brand-dark font-black uppercase tracking-widest rounded-2xl hover:bg-brand-red hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 text-sm sm:text-base"
                            >
                              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {searchResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="bg-brand-surface border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto"
                            >
                              {searchResults.map((result, idx) => (
                                <div key={idx} className="p-4 sm:p-6 hover:bg-white/5 transition-colors flex justify-between items-center gap-4 sm:gap-6">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-black text-white truncate uppercase tracking-tight">{result.display_name.split(',')[0]}</p>
                                    <p className="text-[10px] sm:text-xs text-white/30 truncate font-medium">{result.display_name}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => selectResult(result)}
                                    className="shrink-0 px-4 sm:px-6 py-2 bg-brand-red text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all"
                                  >
                                    Selecionar
                                  </button>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-4">
                          <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand-red" />
                            Marcação Manual no Mapa
                          </label>
                          <div className="h-[300px] sm:h-[400px] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-2 border-white/5 relative group">
                            <Mapa 
                              postos={formData.lat && formData.lng ? [{
                                idPosto: 'temp',
                                nome: 'Local Selecionado',
                                endereco: formData.endereco,
                                cidade: formData.cidade,
                                lat: formData.lat,
                                lng: formData.lng,
                                bandeira: formData.bandeira as BandeiraPosto,
                                foto: null,
                                descricaoResumo: 'Local marcado para a denúncia.',
                                ultimaDataDenuncia: new Date().toISOString().split('T')[0],
                                totalDenuncias: 1,
                                denuncias: []
                              }] : []} 
                              onMapClick={handleMapClick}
                              center={formData.lat && formData.lng ? [formData.lat, formData.lng] : undefined}
                              zoom={formData.lat && formData.lng ? 16 : undefined}
                            />
                          </div>
                          {formData.endereco && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-brand-red/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-brand-red/20 flex items-center gap-4 sm:gap-5"
                            >
                              <div className="bg-brand-red p-2 sm:p-3 rounded-xl shrink-0">
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <strong className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-brand-red mb-1">Localização Confirmada</strong>
                                <span className="text-xs sm:text-sm font-bold text-white line-clamp-1">{formData.nome || 'Posto'} — {formData.endereco}</span>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          disabled={!formData.lat}
                          onClick={() => setStep(2)}
                          className="w-full sm:w-auto px-10 sm:px-12 py-5 sm:py-6 bg-brand-red text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-500 disabled:opacity-30 disabled:grayscale transition-all shadow-2xl shadow-brand-red/20 active:scale-95 flex items-center justify-center gap-3 text-sm sm:text-base"
                        >
                          Próximo Passo
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-6 sm:p-12 space-y-8 sm:space-y-10"
                    >
                      <div className="space-y-6 sm:space-y-8">
                        <div className="space-y-4">
                          <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Identificação do Estabelecimento</label>
                          <input
                            type="text"
                            required
                            placeholder="Nome fantasia do posto..."
                            className="w-full px-6 sm:px-8 py-5 sm:py-6 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-brand-red focus:bg-white/10 outline-none transition-all text-white font-bold text-lg sm:text-xl"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Bandeira / Operadora</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {[
                              { id: 'ipiranga', name: 'Ipiranga', logo: logosBandeiras.ipiranga },
                              { id: 'petrobras', name: 'Petrobras', logo: logosBandeiras.petrobras },
                              { id: 'shell', name: 'Shell', logo: logosBandeiras.shell },
                              { id: 'ale', name: 'Ale', logo: logosBandeiras.ale },
                              { id: 'rodoil', name: 'Rodoil', logo: logosBandeiras.rodoil },
                              { id: 'texaco', name: 'Texaco', logo: logosBandeiras.texaco },
                              { id: 'sim', name: 'Posto SIM', logo: logosBandeiras.sim },
                              { id: 'branca', name: 'B. Branca', logo: logosBandeiras.branca },
                              { id: 'outros', name: 'Outros', logo: null }
                            ].map((brand) => (
                              <button
                                key={brand.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, bandeira: brand.id })}
                                className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all gap-3 sm:gap-4 ${
                                  formData.bandeira === brand.id
                                    ? 'border-brand-red bg-brand-red/10 shadow-xl shadow-brand-red/10'
                                    : 'border-white/5 bg-white/5 hover:border-white/10'
                                }`}
                              >
                                <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center">
                                  {brand.logo ? (
                                    <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
                                  ) : (
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white/30 font-black text-xs sm:text-base">?</div>
                                  )}
                                </div>
                                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${
                                  formData.bandeira === brand.id ? 'text-brand-red' : 'text-white/30'
                                }`}>
                                  {brand.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Cidade / Município</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: São Paulo"
                            className="w-full px-6 sm:px-8 py-5 sm:py-6 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-brand-red focus:bg-white/10 outline-none transition-all text-white font-bold text-sm sm:text-base"
                            value={formData.cidade}
                            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="w-full sm:w-auto px-8 sm:px-10 py-5 sm:py-6 text-white/40 font-black uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          Voltar
                        </button>
                        <button
                          type="button"
                          disabled={!formData.nome || !formData.cidade}
                          onClick={() => setStep(3)}
                          className="w-full sm:w-auto px-10 sm:px-12 py-5 sm:py-6 bg-brand-red text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-500 disabled:opacity-30 transition-all shadow-2xl shadow-brand-red/20 active:scale-95 flex items-center justify-center gap-3 text-sm sm:text-base"
                        >
                          Próximo Passo
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-6 sm:p-12 space-y-8 sm:space-y-10"
                    >
                      <div className="space-y-6 sm:space-y-8">
                        <div className="space-y-4">
                          <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Detalhamento da Ocorrência</label>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            {[
                              'Combustível Adulterado',
                              'Preço Abusivo',
                              'Bomba com Defeito',
                              'Atendimento Ruim',
                              'Falta de Nota Fiscal',
                              'Venda Casada'
                            ].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const current = formData.descricao;
                                  if (!current.includes(tag)) {
                                    setFormData({ ...formData, descricao: current ? `${current}, ${tag}` : tag });
                                  }
                                }}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-white/60 uppercase tracking-widest hover:bg-brand-red/20 hover:text-brand-red hover:border-brand-red/30 transition-all"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>

                          <textarea
                            required
                            rows={6}
                            placeholder="Relate os fatos com o máximo de detalhes possível..."
                            className="w-full px-6 sm:px-8 py-6 sm:py-8 bg-white/5 border-2 border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] focus:border-brand-red focus:bg-white/10 outline-none transition-all text-white font-medium text-base sm:text-lg leading-relaxed resize-none"
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      {/* Desktop Buttons */}
                      <div className="hidden sm:flex justify-between gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="px-10 py-6 text-white/40 font-black uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-3"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          Voltar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !formData.descricao}
                          className="flex items-center justify-center gap-4 px-12 py-6 bg-brand-red text-white font-black rounded-2xl hover:bg-red-500 disabled:opacity-30 transition-all shadow-2xl shadow-brand-red/40 active:scale-95 uppercase tracking-widest text-sm"
                        >
                          {isSubmitting ? (
                            <><Loader2 className="w-6 h-6 animate-spin" /> Transmitindo...</>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              Finalizar Protocolo
                            </>
                          )}
                        </button>
                      </div>

                      {/* Mobile Sticky Buttons */}
                      <div className="sm:hidden fixed bottom-20 left-0 right-0 p-4 bg-brand-dark/80 backdrop-blur-xl border-t border-white/5 z-[90] flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="flex-1 py-4 bg-white/5 text-white/60 font-black uppercase tracking-widest rounded-2xl border border-white/10 text-xs"
                        >
                          Voltar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !formData.descricao}
                          className="flex-[2] py-4 bg-brand-red text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-red/20 disabled:opacity-30 text-xs"
                        >
                          {isSubmitting ? 'Transmitindo...' : 'Finalizar'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Sticky Navigation for other steps */}
      {step < 3 && (
        <div className="sm:hidden fixed bottom-20 left-0 right-0 p-4 bg-brand-dark/80 backdrop-blur-xl border-t border-white/5 z-[90] flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 bg-white/5 text-white/60 font-black uppercase tracking-widest rounded-2xl border border-white/10 text-xs"
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            disabled={
              (step === 1 && !formData.lat) ||
              (step === 2 && (!formData.nome || !formData.cidade))
            }
            onClick={() => setStep(step + 1)}
            className={`${step === 1 ? 'w-full' : 'flex-[2]'} py-4 bg-brand-red text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-red/20 disabled:opacity-30 text-xs`}
          >
            Próximo
          </button>
        </div>
      )}
      </div>
    </>
  );
}
