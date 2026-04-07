import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, MapPin, AlertTriangle, Info, Car, Bike, Truck, Fuel } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

const FloatingIcons = () => {
  const iconTypes = [Car, Bike, Truck, Fuel];
  
  // Use a smaller number of icons on mobile
  const [iconCount, setIconCount] = React.useState(60);

  React.useEffect(() => {
    const handleResize = () => {
      setIconCount(window.innerWidth < 768 ? 20 : 60);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const icons = React.useMemo(() => 
    Array.from({ length: iconCount }).map((_, i) => ({
      Icon: iconTypes[i % iconTypes.length],
      size: 10 + Math.random() * 25,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
      opacity: 0.03 + Math.random() * 0.08,
      glow: Math.random() > 0.7
    })), [iconCount]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] bg-brand-dark">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-red/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-red/5 rounded-full blur-[120px]" />
      
      {icons.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [item.opacity, item.opacity * 2, item.opacity],
            y: [0, -60, 0],
            x: [0, 30, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ 
            duration: item.duration, 
            repeat: Infinity, 
            delay: item.delay,
            ease: "easeInOut"
          }}
          className={`absolute text-white/20 ${item.glow ? 'drop-shadow-[0_0_8px_rgba(255,30,30,0.4)] text-brand-red/30' : ''}`}
          style={{ top: item.top, left: item.left }}
        >
          <item.Icon size={item.size} strokeWidth={1} />
        </motion.div>
      ))}
    </div>
  );
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { name: 'Mapa', path: '/', icon: Map },
    { name: 'Denunciar', path: '/denunciar', icon: AlertTriangle },
    { name: 'Sobre', path: '/sobre', icon: Info },
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col font-sans relative selection:bg-brand-red selection:text-white pb-24">
      <FloatingIcons />
      
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>

      <footer className="relative z-[90] px-4 pb-20 text-center">
        <p className="text-xs sm:text-sm text-white/60 font-medium">
          Plataforma sem fins lucativos. Divulge!
        </p>
        <p className="text-xs sm:text-sm text-white/40 mt-1">
          Desenvolvido por{' '}
          <a
            href="https://douglaspaiani.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-red font-bold hover:text-red-400 transition-colors"
          >
            Douglas Paiani
          </a>
        </p>
      </footer>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[200000] bg-brand-dark/80 backdrop-blur-2xl border-t border-white/5 px-6 py-3 pb-8 sm:pb-3">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${
                  isActive ? 'text-brand-red' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${
                  isActive ? 'bg-brand-red/10 scale-110' : 'bg-transparent'
                }`}>
                  <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  isActive ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-1'
                }`}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute -top-3 w-1 h-1 bg-brand-red rounded-full shadow-[0_0_10px_#FF1E1E]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
