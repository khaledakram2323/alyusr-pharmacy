import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJson, useStorageSync, writeJson } from '../lib/storage';
import type { InboxMessage, InboxStatus, OrderMessage, PrescriptionMessage } from '../types';

/**
 * ⚠️ Device-local inbox — there is no server yet.
 * Orders and prescriptions are appended to `inboxMessages` in this browser's localStorage,
 * so the dashboard only sees requests made in the same browser. Replace `persist` / `readMessages`
 * with API calls when a backend exists; the rest of the app only talks to this context.
 */

type NewOrder = Pick<OrderMessage, 'items' | 'total' | 'address' | 'phone' | 'customerName'>;
type NewPrescription = Pick<PrescriptionMessage, 'image' | 'fileName' | 'fileType' | 'phone' | 'contactMethod' | 'customerName'>;

interface InboxValue {
  /** Newest first. */
  messages: InboxMessage[];
  unreadCount: number;
  /** Both return the reference shown to the customer. */
  addOrder: (order: NewOrder) => string;
  addPrescription: (prescription: NewPrescription) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Completing, rejecting or reopening a message also marks it as reviewed. */
  setStatus: (id: string, status: InboxStatus) => void;
  remove: (id: string) => void;
}

const STORAGE_KEY = 'alyusr.inboxMessages';
const MAX_MESSAGES = 200;
const InboxContext = createContext<InboxValue | null>(null);

function readMessages(): InboxMessage[] {
  const parsed = readJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return (parsed as InboxMessage[]).filter(
    (message) =>
      message &&
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      (message.kind === 'prescription' || (message.kind === 'order' && Array.isArray(message.items))),
  );
}

/** localStorage holds ~5 MB: if it fills up, prescription photos are dropped oldest-first so the message itself is kept. */
function persist(messages: InboxMessage[]) {
  if (writeJson(STORAGE_KEY, messages)) return;
  const slim = messages.map((message) => ({ ...message }));
  for (let index = slim.length - 1; index >= 0; index -= 1) {
    const message = slim[index];
    if (message.kind !== 'prescription' || !message.image) continue;
    delete message.image;
    if (writeJson(STORAGE_KEY, slim)) return;
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const newRef = (prefix: string) => `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

export function InboxProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<InboxMessage[]>(readMessages);

  useEffect(() => {
    persist(messages);
  }, [messages]);

  // A customer ordering in another tab shows up in the open dashboard without a refresh.
  useStorageSync(
    STORAGE_KEY,
    useCallback(() => setMessages(readMessages()), []),
  );

  const push = useCallback((message: InboxMessage) => {
    setMessages((current) => [message, ...current].slice(0, MAX_MESSAGES));
  }, []);

  const addOrder = useCallback<InboxValue['addOrder']>(
    (order) => {
      const ref = newRef('ORD');
      push({ ...order, kind: 'order', id: newId(), ref, createdAt: Date.now(), read: false, status: 'pending' });
      return ref;
    },
    [push],
  );

  const addPrescription = useCallback<InboxValue['addPrescription']>(
    (prescription) => {
      const ref = newRef('RX');
      push({ ...prescription, kind: 'prescription', id: newId(), ref, createdAt: Date.now(), read: false, status: 'pending' });
      return ref;
    },
    [push],
  );

  const update = useCallback((id: string, change: Partial<Pick<InboxMessage, 'read' | 'status'>>) => {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...change } : message)));
  }, []);

  const markRead = useCallback((id: string) => update(id, { read: true }), [update]);
  const setStatus = useCallback((id: string, status: InboxStatus) => update(id, { status, read: true }), [update]);
  const markAllRead = useCallback(
    () => setMessages((current) => current.map((message) => (message.read ? message : { ...message, read: true }))),
    [],
  );
  const remove = useCallback((id: string) => setMessages((current) => current.filter((message) => message.id !== id)), []);

  const value = useMemo<InboxValue>(
    () => ({
      messages,
      unreadCount: messages.reduce((count, message) => count + (message.read ? 0 : 1), 0),
      addOrder,
      addPrescription,
      markRead,
      markAllRead,
      setStatus,
      remove,
    }),
    [messages, addOrder, addPrescription, markRead, markAllRead, setStatus, remove],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox must be used inside <InboxProvider>');
  return ctx;
}
