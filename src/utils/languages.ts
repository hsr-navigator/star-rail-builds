export const languages = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'cht', name: '繁體中文' },
    { code: 'vn', name: 'Tiếng Việt' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    /*{ code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },*/
] as const;

export type LanguageCode = (typeof languages)[number]['code'];

export const languageCodes = languages.map((language) => language.code);
