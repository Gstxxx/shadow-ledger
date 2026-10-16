// pt-BR é a fonte da verdade das chaves. Cada área vive em seu arquivo; `as const` mantém as chaves tipadas.
import common from './common';

const ptBR = { ...common } as const;
export default ptBR;
