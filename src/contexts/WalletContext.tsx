import React, { createContext, useCallback, useContext, useState } from 'react';
import { accountService } from '../services/api';
import { useAuth } from './AuthContext';

interface WalletContextType {
  balance: number;
  loading: boolean;
  fetchBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await accountService.getBalance();
      const value =
        typeof data === 'number'
          ? data
          : (data?.balance ?? data?.amount ?? data?.solde ?? 0);
      setBalance(Number(value) || 0);
    } catch (error) {
      console.error('Erreur fetchBalance:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  return (
    <WalletContext.Provider value={{ balance, loading, fetchBalance }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet doit être utilisé dans un WalletProvider');
  return ctx;
};
