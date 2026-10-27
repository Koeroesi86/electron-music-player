import { useRef, useState } from 'react';
import type { DragEvent } from 'react';

/** Reordering a list by dragging its items: the props of an item, and the index of the item the dragged one is over */
export const useDragReorder = (onMove: (id: number, toIndex: number) => void) => {
  const dragged = useRef<number | undefined>(undefined);
  const [overIndex, setOverIndex] = useState<number | undefined>(undefined);

  const reset = () => {
    dragged.current = undefined;
    setOverIndex(undefined);
  };

  const itemProps = (id: number, index: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      dragged.current = id;
      event.dataTransfer.effectAllowed = 'move';
      // Firefox-like engines need data to start a drag
      event.dataTransfer.setData('text/plain', String(id));
    },
    onDragOver: (event: DragEvent) => {
      // a drag from outside the list (a file, a text) is not ours to take
      if (dragged.current === undefined) return;

      event.preventDefault();
      setOverIndex(index);
    },
    onDrop: (event: DragEvent) => {
      if (dragged.current === undefined) return;

      event.preventDefault();
      onMove(dragged.current, index);
      reset();
    },
    onDragEnd: reset,
  });

  return { itemProps, overIndex };
};
