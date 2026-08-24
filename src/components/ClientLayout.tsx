'use client';

import Header from './Header';
import ChatbotWidget from './ChatbotWidget';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="app-content">{children}</div>
      <ChatbotWidget />
    </>
  );
}
