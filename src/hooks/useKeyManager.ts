import { useEffect, useRef, useCallback } from 'react';
import KeyController from 'keycon';

// 检查当前焦点是否在输入框中
function checkInput(target: HTMLElement): boolean {
  if (!target) return false;
  const tagName = target.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea';
  const isContentEditable = target.contentEditable === 'true';
  return isInput || isContentEditable;
}

function check(e: any): boolean {
  const inputEvent = e.inputEvent;
  const target = inputEvent?.target || document.activeElement;

  if (checkInput(target)) {
    return false;
  }
  return true;
}

export type KeyAction = {
  keys: string[];
  callback: (e: any) => void;
  description?: string;
  type?: 'keydown' | 'keyup';
};

export type KeyManager = {
  registerKey: (action: KeyAction) => void;
  unregisterKey: (action: { keys: string[]; type?: 'keyup' | 'keydown' }) => void;
  enable: () => void;
  disable: () => void;
  clearAll: () => void;
  keycon: KeyController;
};

// 生成唯一的 key 标识符
const generateKeyId = (keys: string[], type?: 'keyup' | 'keydown'): string => {
  return `${keys.join(',')}_${type || 'keydown'}`;
};

const useKeyManager = (): KeyManager => {
  const keyconRef = useRef<KeyController>(new KeyController());
  const isEnabledRef = useRef(true);
  // 保存已注册的回调函数映射，使用字符串作为 key
  const callbackMapRef = useRef<Map<string, (e: any) => void>>(new Map());

  useEffect(() => {
    console.log('keycon初始化');
    keyconRef.current = new KeyController();

    return () => {
      console.log('keycon摧毁');
      keyconRef.current?.destroy();
      callbackMapRef.current.clear();
    };
  }, []);

  // 手动注册快捷键的方法
  const registerKey = useCallback((action: KeyAction) => {
    const keycon = keyconRef.current;
    if (!keycon) return;

    const wrappedCallback = (e: any) => {
      if (!isEnabledRef.current || !check(e)) {
        return false;
      }
      action.callback(e);
    };

    // 使用 keys 和 type 生成唯一标识符
    const keyId = generateKeyId(action.keys, action.type);
    callbackMapRef.current.set(keyId, wrappedCallback);

    if (action.type === 'keyup') {
      keycon.keyup(action.keys, wrappedCallback);
    } else {
      keycon.keydown(action.keys, wrappedCallback);
    }
  }, []);

  const unregisterKey = useCallback((action: { keys: string[]; type?: 'keyup' | 'keydown' }) => {
    const keycon = keyconRef.current;
    if (!keycon) return;

    // 使用相同的方式生成标识符
    const keyId = generateKeyId(action.keys, action.type);
    const wrappedCallback = callbackMapRef.current.get(keyId);
    if (!wrappedCallback) return;

    if (action.type === 'keyup') {
      keycon.offKeyup(action.keys, wrappedCallback);
    } else {
      keycon.offKeydown(action.keys, wrappedCallback);
    }

    // 从映射中移除
    callbackMapRef.current.delete(keyId);
  }, []);

  // 启用/禁用快捷键
  const enable = useCallback(() => {
    isEnabledRef.current = true;
  }, []);

  const disable = useCallback(() => {
    isEnabledRef.current = false;
  }, []);

  // 清除所有快捷键
  const clearAll = useCallback(() => {
    const keycon = keyconRef.current;
    if (keycon) {
      keycon.destroy();
      keyconRef.current = new KeyController();
      callbackMapRef.current.clear();
    }
  }, []);

  return {
    registerKey,
    unregisterKey,
    enable,
    disable,
    clearAll,
    keycon: keyconRef.current,
  };
};

export default useKeyManager;
