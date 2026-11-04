import '@/i18n/i18n';
import { useCallback } from 'react';
import { useTranslation as _useTranslation } from 'react-i18next';

export type TranslationFunc = (key: string, options?: Record<string, number | string>) => string;

export const useTranslation = (namespace: string = 'translation') => {
  const { t } = _useTranslation(namespace);

  // Personal fork: every UI string shows this app's name, in every language.
  return useCallback(
    (key: string, options = {}) =>
      String(t(key, { defaultValue: key, ...options })).replace(/\bReadest\b/g, 'My Book Reader'),
    [t],
  );
};
