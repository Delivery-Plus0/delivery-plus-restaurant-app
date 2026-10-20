import { addArabic, addArabicPlurals } from './core';
import { appArabic, appArabicPlurals } from './ar';
import { kitArabic } from './kit-ar';

// #151: the kit's Arabic, then this app's. Import '@/i18n' (not core) wherever text is rendered.
addArabic(kitArabic);
addArabic(appArabic);
// #27: this app's counted nouns (all six Arabic forms each), used by tn().
addArabicPlurals(appArabicPlurals);

export * from './core';
export * from './device';
