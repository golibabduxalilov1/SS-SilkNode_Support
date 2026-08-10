import { useEffect, useState } from 'react';
import { useCurrentUser } from './hooks/useCurrentUser';
import { SplashScreen } from './screens/SplashScreen';
import { AdminNoticeScreen } from './screens/AdminNoticeScreen';
import { NewTicketPage } from './pages/NewTicket/NewTicketPage';
import { MyTicketsPage } from './pages/MyTickets/MyTicketsPage';
import { TicketDetailPage } from './pages/TicketDetail/TicketDetailPage';
import { getTelegramWebApp } from './telegram/webApp';

type Tab = 'new' | 'mine';

function getInitialTicketIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('ticketId');
}

/**
 * Bo'lim 5.1: admin/superadmin uchun UI komponentlari (tugma, menyu, panel
 * havolasi) umuman render qilinmaydi — CSS bilan yashirilmaydi.
 */
export function App() {
  const { status, isLoading, error } = useCurrentUser();
  const [tab, setTab] = useState<Tab>('new');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    getInitialTicketIdFromUrl,
  );

  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready();
    webApp?.expand();
  }, []);

  if (isLoading) return <SplashScreen />;

  if (error || !status) {
    return (
      <div className="error-screen">
        <p>{error ?? "Noma'lum xatolik."}</p>
      </div>
    );
  }

  if (status.role === 'admin' || status.role === 'superadmin') {
    return <AdminNoticeScreen />;
  }

  if (selectedTicketId) {
    return (
      <div className="app">
        <TicketDetailPage
          ticketId={selectedTicketId}
          onBack={() => {
            setSelectedTicketId(null);
            setTab('mine');
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="tabs">
        <button className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>
          Yangi murojaat
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          Mening murojaatlarim
        </button>
      </nav>

      {tab === 'new' ? (
        <NewTicketPage
          status={status}
          onCreated={() => {
            setRefreshKey((k) => k + 1);
            setTab('mine');
          }}
        />
      ) : (
        <MyTicketsPage refreshKey={refreshKey} onOpenTicket={setSelectedTicketId} />
      )}
    </div>
  );
}
