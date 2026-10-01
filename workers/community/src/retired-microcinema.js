import config from '../../../src/_data/i18n/config.json' with { type: 'json' };
import { json } from './security.js';

export const microcinemaUrl = language => config.pages.microcinema[language === 'es' ? 'es' : 'en'];
export function retiredMicrocinema() {
  return json({error:'microcinema_moved',url:microcinemaUrl('en')},410);
}
