import React, { useCallback, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import HotBar, { TABS } from './HotBar';
import PipBoyStartup from './PipBoyStartup';
import StatusBar from './pipboy/StatusBar';
import TabBar from './pipboy/TabBar';
import { IS_ARTIFACT } from '@/api/base44Client';
import DashboardTab from './tabs/DashboardTab';
import WarNewsTab from './tabs/WarNewsTab';
import CatastropheTab from './tabs/CatastropheTab';
import WeatherTab from './tabs/WeatherTab';
import RadioTab from './tabs/RadioTab';
import MusicTab from './tabs/MusicTab';
import PizzaIndexTab from './tabs/PizzaIndexTab';
import SurvivalAITab from './tabs/SurvivalAITab';
import KnowledgeFilesTab from './tabs/KnowledgeFilesTab';
import SurvivalManualTab from './tabs/SurvivalManualTab';
import BragaMapTab from './tabs/BragaMapTab';
import NotificationsTab from './tabs/NotificationsTab';

// Separadores cujos dados vêm da IA sem acesso à internet (não são dados reais)
const SIMULATED = ['dashboard', 'guerra', 'catastrofes', 'meteo', 'pizza'];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [booting, setBooting] = useState(true);
  const [threatLevel, setThreatLevel] = useState(0);
  // useCallback: o efeito do PipBoyStartup depende de onComplete,
  // por isso a função tem de ser estável para a animação não reiniciar.
  const handleBootComplete = useCallback(() => setBooting(false), []);
  const handleThreat = useCallback((v) => setThreatLevel(Number(v) || 0), []);

  if (booting) return <PipBoyStartup onComplete={handleBootComplete} />;

  const activeTab = TABS.find((t) => t.path === location.pathname)?.id || 'dashboard';
  const elements = {
    dashboard: <DashboardTab onThreatLevelChange={handleThreat} />,
    guerra: <WarNewsTab />,
    catastrofes: <CatastropheTab />,
    meteo: <WeatherTab />,
    radio: <RadioTab />,
    musica: <MusicTab />,
    pizza: <PizzaIndexTab />,
    assistente: <SurvivalAITab />,
    conhecimento: <KnowledgeFilesTab />,
    manual: <SurvivalManualTab />,
    mapa: <BragaMapTab />,
    alertas: <NotificationsTab />,
  };

  return (
    <div className="crt min-h-full">
      <div className="sticky z-30" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <StatusBar threatLevel={threatLevel} />
        {IS_ARTIFACT && SIMULATED.includes(activeTab) && (
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-center" style={{ background: '#331a00', color: '#ffaa00', borderBottom: '1px solid #ffaa0044' }}>
            Simulação — dados gerados por IA sem internet. Não são reais.
          </div>
        )}
      </div>
      <main className="max-w-2xl mx-auto pb-40">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {TABS.map((tab) => (
            <Route key={tab.id} path={tab.path} element={elements[tab.id]} />
          ))}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <HotBar />
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={(id) => navigate(TABS.find((t) => t.id === id).path)} />
    </div>
  );
}
