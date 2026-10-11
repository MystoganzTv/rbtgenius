import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAttemptId, postStudyAttempt } from '../services/studyAttempts';

// One durable pending attempt per account and study screen. Never discard an
// answer because a previous request is still in flight, or count an HTTP error.
export function useStudySave(userId, token, source, onSaved) {
  const key = `rbt_pending_attempt:${userId || 'signed-out'}:${source}`;
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const pendingRef = useRef(null);
  const activeKey = useRef(key);
  activeKey.current = key;
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    pendingRef.current = null;
    setPending(null);
    AsyncStorage.getItem(key).then(raw => {
      if (cancelled) return;
      const item = raw ? JSON.parse(raw) : null;
      pendingRef.current = item;
      setPending(item);
      setError(Boolean(item));
    }).catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [key]);

  const send = async item => {
    if (!token || busy.current) return null;
    busy.current = true;
    setSaving(true);
    setError(false);
    pendingRef.current = item;
    setPending(item);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(item));
      const result = await postStudyAttempt(token, item);
      await AsyncStorage.removeItem(key);
      if (activeKey.current === key) {
        pendingRef.current = null;
        setPending(null);
        onSaved?.(result);
      }
      return result;
    } catch {
      if (activeKey.current === key) setError(true);
      return null;
    } finally {
      busy.current = false;
      if (activeKey.current === key) setSaving(false);
    }
  };
  return {
    saving, error, pending,
    blocked: !ready || saving || Boolean(pending),
    save: payload => {
      if (!ready || busy.current || pendingRef.current) return Promise.resolve(null);
      return send({ ...payload, source, attempt_id: createAttemptId() });
    },
    retry: () => pendingRef.current ? send(pendingRef.current) : Promise.resolve(null),
  };
}
