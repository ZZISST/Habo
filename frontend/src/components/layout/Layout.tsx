import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// Layout specifically for authentication pages (without header/footer)
export function AuthLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

// Layout for landing page (different styling)
export function LandingLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {children}
    </div>
  );
}
