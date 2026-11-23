// 기능: 아래에서 올라오는 시트 (대화상자). AnimatePresence 안에서 쓰면 닫힐 때도 내려감

import { m } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { QUICK } from '../lib/motion';
import { CloseIcon } from './icons';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ title, onClose, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // 부모가 다시 그려질 때마다 onClose 가 새 함수로 와도 아래 효과가 다시 돌지 않게 ref 로 둔다.
  // 다시 돌면 포커스가 입력 칸에서 패널로 옮겨져, 주간 계획을 5초마다 다시 받는 동안 시간 입력이 끊겼다
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, []);

  // 화면 전환 중인 부모의 영향을 받지 않도록 body 바로 아래에 그림
  return createPortal(
    <div className="sheet" role="presentation">
      <m.button
        type="button"
        className="sheet__backdrop"
        aria-label="닫기"
        onClick={onClose}
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={QUICK}
      />
      <m.div
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        <header className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="icon-button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__footer">{footer}</footer>}
      </m.div>
    </div>,
    document.body,
  );
}
