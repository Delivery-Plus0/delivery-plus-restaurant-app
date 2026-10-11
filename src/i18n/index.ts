import { addArabic } from './core';
import { appArabic } from './ar';
import { kitArabic } from './kit-ar';

// #151: the kit's Arabic, then this app's. Import '@/i18n' (not core) wherever text is rendered.
addArabic(kitArabic);
addArabic(appArabic);

export * from './core';
export * from './device';
