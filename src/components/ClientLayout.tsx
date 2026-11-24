'use client';

import Header from './Header';
import ChatbotWidget from './ChatbotWidget';
import BottomNav from './BottomNav';
import ServiceWorkerRegister from './ServiceWorkerRegister';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="app-content">{children}</div>
      <BottomNav />
      <ChatbotWidget />
      <ServiceWorkerRegister />
    </>
  );
}
