import { useId, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';

/** The open state of a button with a panel: it closes with Escape, which gives the focus back to the button, and when the focus leaves the panel and the button */
export const usePopup = (onClose?: () => void) => {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !open) return;

    event.stopPropagation();
    close();
    event.currentTarget.querySelector('button')?.focus();
  };

  return { open, panelId, close, toggle: () => (open ? close() : setOpen(true)), rootProps: { onBlur, onKeyDown } };
};
