import { useLayoutEffect, useRef, type RefObject } from "react";
import type { TodoItem } from "./types";
import { todoLayoutTop, todoMotionOptions, todoReducedMotion } from "./todoDragGeometry";

export function useTodoReorderMotion(listRef: RefObject<HTMLDivElement | null>, todos: TodoItem[], draggedId: string | null) {
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    listRef.current?.querySelectorAll<HTMLElement>("[data-todo-id]").forEach((row) => {
      const id = row.dataset.todoId!;
      const top = todoLayoutTop(row);
      const previous = positions.current.get(id);
      next.set(id, top);
      if (id === draggedId || row.style.transform || row.dataset.todoSettling || previous === undefined) return;
      const visualTop = row.getBoundingClientRect().top;
      row.getAnimations().forEach((animation) => animation.cancel());
      if (todoReducedMotion() || Math.abs(previous - top) < 1) return;
      // When crossing multiple rows consecutively, continue from unfinished animation position to avoid jumping back to old layout.
      const delta = previous - top + visualTop - top;
      row.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], todoMotionOptions);
    });
    positions.current = next;
  }, [todos, draggedId, listRef]);
  useLayoutEffect(() => () => {
    listRef.current?.querySelectorAll<HTMLElement>("[data-todo-id]").forEach((row) => {
      row.getAnimations().forEach((animation) => animation.cancel());
    });
  }, [listRef]);
}
