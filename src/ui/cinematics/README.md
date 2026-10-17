# Cenas curtas (cinematics)

Momentos grandes ganham uma cena de poucos segundos antes do tabuleiro. O primeiro exemplo é o **Golpe de Estado** (`coup.ts`).

- **Formato:** diorama 2.5D em camadas (céu, cidade, palácio, holofotes, avenida, fumaça, blindados e pelotão, soldados em primeiro plano). Câmera com dolly e pan, e cada camada se desloca conforme a sua profundidade.
- **Sobreposições:** sirene vermelha e azul, grão, vinheta, telex datilografado, mapa tático preso por um clipe e a tarja "URGENTE · GOLPE EM CURSO · <PAÍS>" revelada pela barra de censura.
- **Fim:** corte seco ao preto em 7,0 s, e aí entra o tabuleiro do Combate.
- **Leve:** só `transform`/`opacity` animam; tudo é SVG/DOM, sem vídeo. Timeline GSAP seek-safe: setters por função, e os sons só tocam em play.
- **Reduzir movimento:** cartão estático de 1,5 s, com palácio, tarja, telex e mapa já abertos.
- **Pular:** toque, Esc, Enter ou espaço levam direto ao corte.
- **Som** (`src/audio`): `alert` (sirenes) em 0,4 s e 3,3 s, `type` em cada linha do telex, `hit` no impacto da tarja, `redact` na barra e `kill` no corte.

## Uso

```tsx
import { CoupCinematic } from '../cinematics';
{showCoup && <CoupCinematic country={countryName(id, lang)} onDone={() => setShowCoup(false)} />}
```

Sem React: `buildCoup(host, { text, reduced, images, sound, onDone })` devolve `{ tl, cutAt, skip(), destroy() }`. A timeline vem pausada; chame `tl.play(0)`.

## Imagens geradas depois

Cada camada tem `data-slot` (`sky | city | palace | avenue | tanks | fg`). Para trocar um desenho por uma imagem gerada, passe `images={{ palace: url, sky: url }}`. A imagem cobre a camada (`object-fit: cover`) e herda a câmera e o parallax da camada. Na camada `tanks`, só o fundo é substituído; os blindados e o pelotão continuam sendo os desenhos animados.

## Prévia e vídeo

`/src/ui/cinematics/preview.html`: toque para tocar. Parâmetros: `?render=1` (para o render.mjs), `?rm=1` e `?country=818` (id numérico do país). A prévia mostra 1,3 s de um tabuleiro parado depois do corte.
