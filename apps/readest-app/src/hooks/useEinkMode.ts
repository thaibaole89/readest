import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export const useEinkMode = () => {
  const applyEinkMode = useCallback((isEink: boolean) => {
    if (isEink) {
      document.body.classList.add('no-transitions');
    } else {
      document.body.classList.remove('no-transitions');
    }
    document.documentElement.setAttribute('data-eink', isEink.toString());
    // Read here rather than passed in, so every caller keeps the two modes in step.
    const { isColorEink } = useSettingsStore.getState().settings?.globalViewSettings ?? {};
    document.documentElement.setAttribute('data-color-eink', String(!!isColorEink));
  }, []);

  return { applyEinkMode };
};
