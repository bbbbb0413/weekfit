// 기능: 짧은 안내 문구 (화면 하단)

import { AnimatePresence, m } from 'framer-motion';
import { useEffect } from 'react';
import { create } from 'zustand';
import { SPRING } from '../lib/motion';

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));

export function Toast() {
  const { message, hide } = useToast();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 3200);
    return () => clearTimeout(timer);
  }, [message, hide]);
  return (
    <div className="toast-region" role="status" aria-live="polite">
      <AnimatePresence>
        {message && (
          <m.div key={message} className="toast" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={SPRING}>
            {message}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
