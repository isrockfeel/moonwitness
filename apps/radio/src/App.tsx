import { useEffect } from 'react';
import { Switch, Route, Link, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { StationList } from './components/StationList';
import { StationDetail } from './components/StationDetail';
import { LivePage } from './components/LivePage';
import { SettingsPage } from './components/SettingsPage';
import { PlayerBar } from './components/PlayerBar';
import { Header } from './components/Header';
import { StationDrawer } from './components/StationDrawer';
import { useRadioStore } from './stores/radio-store';
import { Toaster } from './components/ui/Toaster';

function AppContent() {
  const location = useLocation();
  const { isStationDrawerOpen, setStationDrawerOpen, audioState } = useRadioStore();

  // Close drawer on route change
  useEffect(() => {
    setStationDrawerOpen(false);
  }, [location, setStationDrawerOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-24 md:pb-32">
        <Switch>
          <Route path="/" component={LivePage} />
          <Route path="/stations" component={StationList} />
          <Route path="/station/:slug" component={StationDetail} />
          <Route path="/live" component={LivePage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
      </main>
      {audioState.currentStation && <PlayerBar />}
      <StationDrawer isOpen={isStationDrawerOpen} onClose={() => setStationDrawerOpen(false)} />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}