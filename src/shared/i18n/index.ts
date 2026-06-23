import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const STORAGE_KEY = 'spellpaw:language';

/**
 * 从 localStorage 读取上次选择的语言。
 * 隐私模式 / SSR 等场景可能抛错，失败则回退到默认 zh-CN。
 */
function getInitialLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh-CN' || saved === 'en') return saved;
  } catch {
    /* localStorage 不可用 */
  }
  return 'zh-CN';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, 'zh-CN': { translation: zhCN } },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// 语言变化时持久化，让用户偏好跨刷新保留
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* 写入失败不影响功能 */
  }
});

export default i18n;
