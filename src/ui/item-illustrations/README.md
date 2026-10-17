# Ilustrações de itens

Uma "foto de arquivo" por item do catálogo (`src/game/data/items.ts`), feita 100% em SVG por código, sem nenhuma imagem baixada.

```tsx
import { ItemIllustration } from '../item-illustrations';
<ItemIllustration id="tank3" size="sm" alt="" />   // 96×64, linhas do Mercado (o nome já está ao lado)
<ItemIllustration id="tank3" size="lg" />          // 480×320, topo do modal de item
```

- **Estilo:** perfil técnico ou 3/4 com luz rasante de cima-esquerda e gradientes em camadas (metal, vidro, oliva, areia, branco de frota). Leva brilho especular, sombra de contato, fundo de arquivo (pátio, céu, mesa, estúdio ou noite) com desfoque de profundidade, filtro frio, vinheta e uma moldura de dossiê com fitas.
- **`sm`:** sem grão nem desfoque, para ficar leve em listas longas. **`lg`:** com o acabamento completo de foto.
- **Pessoal** (`people.tsx`):
  - **Figura:** corpo inteiro em 3/4 com 8 cabeças de altura e o peso na perna da frente. O corpo é montado com segmentos afinados (coxa, canela, braço, antebraço, mãos e sapatos) e roupa com volume e dobras: terno com lapela e gravata, jaqueta de couro com brilho, uniforme com colete e cinto, colete tático com bolsos, camuflado, sobretudo com cinto, tailleur e vestido longo.
  - **Rosto:** em meia-luz (crânio, mandíbula, nariz, orelha e cabelo), sem olhos.
  - **Luz:** contraluz na cor do cenário, uma cópia da silhueta deslocada para trás; luz de preenchimento recortada pela silhueta; sombra de contato e sombra projetada.
  - **Cenário por função:** rua à noite (pistoleiro, policial, agente), corredor frio (guarda-costas, operador), campo ao entardecer (soldado, comando), escritório com persiana (advogados) e salão de palácio com bokeh (Agentes de Influência).
- **Caixas de armamento:** caixa aberta em 3/4, com uma peça de amostra no chão à frente, que é o que permite ler o conteúdo em 96 px.
- **Ids:** os mesmos do catálogo. Para trocar por foto ou imagem gerada, troque a entrada em `SCENES` (`ItemIllustration.tsx`). `ILLUSTRATED_IDS` lista o que está coberto, e um id desconhecido não renderiza nada.
- **Peso:** cada ilustração é markup inline de alguns KB, sem arquivos externos. Os ids de gradiente são únicos por instância (`useId`).

Galeria: `/src/ui/item-illustrations/gallery.html`, com `?size=sm|lg` e `?from=0&n=9`.
