import { renderMsg } from '../../i18n/lookup';
import type { Msg } from '../../i18n/lookup';
import type { Lang } from '../../i18n';

/** Texto de uma mensagem do motor no idioma atual; sem `msg` (saves antigos), usa o texto pt já gravado. */
export const msgText = (msg: Msg | undefined, fallback: string, lang: Lang): string => (msg ? renderMsg(msg, lang) : fallback);
