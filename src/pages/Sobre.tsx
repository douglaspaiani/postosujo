import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Users, Map, Fuel, AlertTriangle, ChevronRight, Radar } from 'lucide-react';
import SeoPagina from '../components/SeoPagina';

export default function Sobre() {
  const features = [
    {
      icon: Map,
      title: 'Mapeamento Colaborativo',
      description: 'Uma rede de motoristas que compartilham experiências reais para identificar postos suspeitos.'
    },
    {
      icon: ShieldCheck,
      title: 'Proteção ao Motorista',
      description: 'Evite danos caros ao motor do seu veículo fugindo de combustíveis "batizados".'
    },
    {
      icon: Users,
      title: 'Comunidade Ativa',
      description: 'Juntos somos mais fortes contra a má fé de estabelecimentos irregulares.'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <>
      <SeoPagina
        titulo="Sobre o PostoSujo | Transparência no combustível"
        descricao="Conheça a missão do PostoSujo e aprenda como identificar sinais de combustível adulterado para abastecer com mais segurança."
        caminho="/sobre"
        palavrasChave="sobre postosujo, combustível adulterado, segurança no abastecimento, sinais de adulteração"
      />
      <div className="flex-1 bg-brand-dark overflow-hidden font-sans">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center px-4 overflow-hidden border-b border-white/5 pt-12">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(255,30,30,0.1)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-brand-red/10 text-brand-red px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-brand-red/20 mb-6 backdrop-blur-md"
          >
            <Radar className="w-3 h-3 animate-pulse" />
            Nossa Missão
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] uppercase italic mb-6"
          >
            Combustível<br />
            <span className="text-brand-red drop-shadow-[0_0_30px_rgba(255,30,30,0.5)]">Transparente</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-medium px-4"
          >
            O PostoSujo nasceu da necessidade de transparência no setor de combustíveis no Brasil. 
          </motion.p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="group p-10 bg-brand-surface border border-white/5 rounded-[3rem] hover:border-brand-red/30 transition-all duration-500 shadow-2xl"
              >
                <div className="bg-brand-red/10 w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:bg-brand-red group-hover:rotate-12 transition-all duration-500 border border-brand-red/20">
                  <f.icon className="text-brand-red w-10 h-10 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase italic mb-4">{f.title}</h3>
                <p className="text-white/40 leading-relaxed font-medium">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Survival Guide Section */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-32 bg-brand-surface rounded-[4rem] p-8 md:p-24 border border-white/5 shadow-3xl relative overflow-hidden group"
          >
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-red/10 to-transparent pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
              <div className="space-y-10">
                <div className="inline-flex items-center gap-3 bg-brand-red/10 text-brand-red px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-brand-red/20">
                  <AlertTriangle className="w-4 h-4" />
                  Protocolo de Segurança
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none uppercase italic">
                  Como identificar <br />
                  <span className="text-brand-red">Adulteração?</span>
                </h2>
                <ul className="space-y-6">
                  {[
                    'Consumo excessivo e repentino de combustível',
                    'Dificuldade na partida do motor (principalmente a frio)',
                    'Perda de potência e "engasgos" durante a aceleração',
                    'Luz da injeção eletrônica acesa no painel',
                    'Cheiro muito forte e diferente vindo do escapamento'
                  ].map((item, i) => (
                    <motion.li 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-5 text-white/60 text-lg font-medium"
                    >
                      <div className="bg-brand-red w-2 h-2 rounded-full shrink-0 shadow-[0_0_15px_rgba(255,30,30,0.8)]" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: -2 }}
                  className="glass-panel p-12 rounded-[3rem] shadow-2xl relative z-10"
                >
                  <div className="bg-brand-red/20 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 border border-brand-red/30">
                    <Fuel className="w-10 h-10 text-brand-red" />
                  </div>
                  <h4 className="text-3xl font-black mb-6 text-white tracking-tight uppercase italic">Dica de Ouro</h4>
                  <p className="text-white/60 leading-relaxed text-lg mb-8 font-medium">
                    Sempre peça a nota fiscal. Ela é sua prova legal de que abasteceu naquele estabelecimento caso precise acionar a justiça ou órgãos de defesa do consumidor.
                  </p>
                  <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center gap-6">
                    <div className="bg-brand-red text-white px-8 py-4 rounded-2xl text-sm font-black tracking-widest shadow-2xl shadow-brand-red/40 uppercase italic">
                      ANP: 0800 970 0267
                    </div>
                    <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Canal oficial de denúncias</span>
                  </div>
                </motion.div>
                <div className="absolute -top-10 -right-10 w-full h-full bg-brand-red rounded-[3rem] -z-0 opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      </div>
    </>
  );
}
