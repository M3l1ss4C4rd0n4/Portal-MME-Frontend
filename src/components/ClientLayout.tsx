'use client';

import Header from './Header';
import ChatbotWidget from './ChatbotWidget';
import BarraSuperiorMovil from './movil/BarraSuperiorMovil';
import ServiceWorkerRegister from './ServiceWorkerRegister';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <BarraSuperiorMovil />
      <div className="app-content">{children}</div>
      <ChatbotWidget />
      <ServiceWorkerRegister />
    </>
  );
}
