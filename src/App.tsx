import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import { AuthProvider } from './contexts/AuthContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WalletProvider } from './contexts/WalletContext';
import { router } from './router';

function AppInner() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Petit délai pour reproduire le splash mobile (2s)
    const t = setTimeout(() => setIsReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!isReady) return <SplashScreen />;
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <WalletProvider>
            <AppInner />
          </WalletProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
