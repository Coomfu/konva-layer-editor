import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { type IObject } from '../type/types';
import type { KeyManager } from './useKeyManager';
import { isMacintosh } from '../utils/const';

export type RestoreCallback = (props: any) => any;
export type HistoryManager = {
  hasUndo: boolean;
  hasRedo: boolean;
  addAction: (type: string, props: IObject<any>) => void;
  registerType: (type: string, undo: RestoreCallback, redo: RestoreCallback) => void;
  undo: () => void;
  redo: () => void;
};
export interface HistoryAction {
  type: string;
  props: IObject<any>;
}

export const useHistoryManager = ({ keyManager }: { keyManager: KeyManager }): HistoryManager => {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const typesRef = useRef<IObject<{ redo: RestoreCallback; undo: RestoreCallback }>>({});

  const addAction = useCallback(
    (type: string, props: IObject<any>) => {
      setUndoStack((prev) => [...prev, { type, props }]);
      setRedoStack([]);
    },
    [setUndoStack, setRedoStack],
  );

  const registerType = useCallback((type: string, undo: RestoreCallback, redo: RestoreCallback) => {
    typesRef.current[type] = { undo, redo };
  }, []);

  const undo = useCallback(() => {
    const undoAction = undoStack[undoStack.length - 1];
    if (!undoAction) return;
    typesRef.current[undoAction.type].undo({ ...undoAction.props });
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newUndoStack = prev.slice(0, -1);
      return newUndoStack;
    });
    setRedoStack((prevRedo) => {
      return [...prevRedo, undoAction];
    });
  }, [undoStack, setUndoStack, setRedoStack]);

  const redo = useCallback(() => {
    const redoAction = redoStack[redoStack.length - 1];
    if (!redoAction) return;
    typesRef.current[redoAction.type].redo({ ...redoAction.props });
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const newRedoStack = prev.slice(0, -1);
      return newRedoStack;
    });
    setUndoStack((prevUndo) => {
      return [...prevUndo, redoAction];
    });
  }, [redoStack, setUndoStack, setRedoStack]);

  const hasUndo = useMemo(() => undoStack.length > 0, [undoStack]);
  const hasRedo = useMemo(() => redoStack.length > 0, [redoStack]);

  useEffect(() => {
    keyManager?.registerKey({
      keys: [isMacintosh ? 'meta' : 'ctrl', 'z'],
      callback: () => {
        undo();
      },
    });
    keyManager?.registerKey({
      keys: [isMacintosh ? 'shift' : 'ctrl', isMacintosh ? 'meta' : 'alt', 'z'],
      callback: () => {
        redo();
      },
    });

    return () => {
      keyManager.unregisterKey({ keys: [isMacintosh ? 'meta' : 'ctrl', 'z'] });
      keyManager.unregisterKey({ keys: [isMacintosh ? 'shift' : 'ctrl', isMacintosh ? 'meta' : 'alt', 'z'] });
    };
  }, [undo, redo]);

  return {
    hasUndo,
    hasRedo,
    addAction,
    registerType,
    undo,
    redo,
  };
};
