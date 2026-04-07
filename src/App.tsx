import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Layout from './components/Layout';
import Inicio from './pages/Inicio';
import Denunciar from './pages/Denunciar';
import Sobre from './pages/Sobre';

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex-1 flex flex-col"
      >
        <Routes location={location}>
          <Route path="/" element={<Inicio />} />
          <Route path="/denunciar" element={<Denunciar />} />
          <Route path="/sobre" element={<Sobre />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    const bloquearCliqueDireito = (evento: MouseEvent) => {
      evento.preventDefault();
    };

    window.addEventListener('contextmenu', bloquearCliqueDireito);

    return () => {
      window.removeEventListener('contextmenu', bloquearCliqueDireito);
    };
  }, []);

  return (
    <Router>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </Router>
  );
}
