import { useCallback, useEffect, useState } from 'react';
import { getAuthState, subscribeAuth, logout as doLogout } from '../api/payload';

export default function useAuth() {
  const [state, setState] = useState(getAuthState);

  useEffect(() => subscribeAuth(setState), []);

  const logout = useCallback(() => { doLogout(); }, []);

  return {
    token: state.token,
    user: state.user,
    role: state.user?.role ?? null,
    isLoggedIn: !!state.token,
    logout,
    // Role helpers
    isAdmin: state.user?.role === 'admin',
    isManager: ['admin', 'manager'].includes(state.user?.role ?? ''),
    isSales: state.user?.role === 'salesperson',
    isInput: state.user?.role === 'input',
    isQC: state.user?.role === 'qc',
    isAccountant: state.user?.role === 'accountant',
    canViewRevenue: ['admin', 'manager', 'accountant'].includes(state.user?.role ?? ''),
    canViewAllDebt: ['admin', 'manager', 'accountant'].includes(state.user?.role ?? ''),
    canViewCustomers: ['admin', 'manager'].includes(state.user?.role ?? ''),
    canViewSuppliers: ['admin', 'manager', 'input', 'qc'].includes(state.user?.role ?? ''),
  };
}
