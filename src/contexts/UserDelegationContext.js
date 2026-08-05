// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/contexts/UserDelegationContext.jsx  (NEW FILE)
//
// PURPOSE: Makes the current user's delegation state available app-wide.
//
// Exposes:
//   outgoing       — delegations the user has set up (they are delegating)
//   incoming       — delegations where they are the delegate
//   lockedTypes    — process type keys the user cannot write (they delegated)
//   isFullyLocked  — true if user has delegated ALL process types
//   hasIncoming    — true if anyone has delegated to this user
//   refresh()      — re-fetch (call after creating/revoking a delegation)
//
//   isLocked(processType)           — quick check
//   findDelegatorFor(processType)   — which of my incoming delegators covers this type
//   findDelegateFor(processType)    — which of my outgoing delegatees covers this type
//
// Wrap <App> (inside Redux Provider) with <UserDelegationProvider>.
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT DEFAULT
// ─────────────────────────────────────────────────────────────────────────────
const UserDelegationContext = createContext({
  outgoing:       [],
  incoming:       [],
  lockedTypes:    [],
  isFullyLocked:  false,
  hasIncoming:    false,
  loading:        false,
  refresh:        () => {},
  isLocked:       () => false,
  findDelegatorFor: () => null,
  findDelegateFor:  () => null,
});

export const useUserDelegation = () => useContext(UserDelegationContext);


// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────
export const UserDelegationProvider = ({ children }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [outgoing,      setOutgoing]      = useState([]);
  const [incoming,      setIncoming]      = useState([]);
  const [loading,       setLoading]       = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setLoading(true);
    try {
      const res = await api.get('/delegations/my-summary');
      if (res.data.success) {
        setOutgoing(res.data.data.outgoing || []);
        setIncoming(res.data.data.incoming || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Compute derived state
  const lockedTypes = useMemo(() => {
    const types = new Set();
    outgoing.forEach((d) => {
      if (d.status !== 'active') return;
      if (d.scope === 'all') {
        // We don't know all type keys here — flag as fully locked
        return;
      }
      (d.processTypes || []).forEach((t) => types.add(t));
    });
    return [...types];
  }, [outgoing]);

  const isFullyLocked = useMemo(
    () => outgoing.some((d) => d.status === 'active' && d.scope === 'all'),
    [outgoing]
  );

  const hasIncoming = useMemo(() => incoming.length > 0, [incoming]);

  // Quick helpers
  const isLocked = useCallback(
    (processType) => isFullyLocked || lockedTypes.includes(processType),
    [isFullyLocked, lockedTypes]
  );

  const findDelegatorFor = useCallback(
    (processType) =>
      incoming.find(
        (d) =>
          d.status === 'active' &&
          (d.scope === 'all' || (d.processTypes || []).includes(processType))
      ) || null,
    [incoming]
  );

  const findDelegateFor = useCallback(
    (processType) =>
      outgoing.find(
        (d) =>
          d.status === 'active' &&
          (d.scope === 'all' || (d.processTypes || []).includes(processType))
      ) || null,
    [outgoing]
  );

  const value = useMemo(
    () => ({
      outgoing,
      incoming,
      lockedTypes,
      isFullyLocked,
      hasIncoming,
      loading,
      refresh:          fetchSummary,
      isLocked,
      findDelegatorFor,
      findDelegateFor,
    }),
    [
      outgoing, incoming, lockedTypes, isFullyLocked,
      hasIncoming, loading, fetchSummary,
      isLocked, findDelegatorFor, findDelegateFor,
    ]
  );

  return (
    <UserDelegationContext.Provider value={value}>
      {children}
    </UserDelegationContext.Provider>
  );
};

export default UserDelegationContext;