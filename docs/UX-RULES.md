# Regras de UI de jogo

Regras para todas as telas e modais da tela de jogo (ADR 0006: mapa como palco, conteúdo em modais centrais). Elas valem para quem cria ou mexe em qualquer tela. Vieram do retorno do usuário ("muita info na tela") sobre o modal de item, aprovado como modelo para o resto.

## As 7 regras

1. **Uma pergunta, um veredito.** Cada tela responde a uma pergunta do jogador ("vendo aqui?", "o que faço neste país?", "minha agência está bem?"). A resposta vem no topo, num veredito com ícone, uma frase e uma ação principal grande.
2. **Um número grande por tela, no máximo.** Os outros números viram etiquetas pequenas ou vão para "Detalhes", que fica recolhido por padrão.
3. **Uma ação primária (âmbar) por tela.** As secundárias são botões fantasma. As destrutivas (dispensar, abortar, vender com prejuízo grande) ficam atrás de uma confirmação.
4. **Sem frases explicativas longas.** Use ícone e rótulo curto. A explicação vai no "?" do glossário.
5. **Listas curtas e priorizadas.** Mostre no máximo 3 a 5 itens, os "melhores para você agora", e ponha "Ver todos" para o resto.
6. **Cor com significado fixo:**
   - âmbar = ação;
   - verde = bom;
   - vermelho = só perigo ou prejuízo;
   - ciano = só "ao vivo";
   - o resto é neutro.
7. **Sensação de jogo.** Prefira cartas, selos, medidores e ícones grandes a tabelas e parágrafos. Todo toque tem retorno imediato (som e micro-motion do kit).

## Peças

- **`<Verdict tone icon action>`** (`src/ui/game/stage/Verdict.tsx`) é o banner do topo. O tom muda a cor e o ícone: `good` usa verde e ✓, `bad` usa vermelho e ⚠, `warn` usa âmbar e ⚠, e `neutral` usa ⓘ.
- **`<Details>`** (mesmo arquivo) é o "Ver detalhes" recolhível, fechado por padrão.
- **Número grande:** a classe `.big-number`, com `.k` para o rótulo, `.v` para o valor e `.note` para a linha pequena embaixo.
- **Listas curtas:** `<ShortList max={4}>` com o botão "Ver todos".

Quando a art-kit publicar versões do kit (`GVerdict`, `GDetails`), estas peças passam a usá-las por dentro, sem mudar quem as usa.

## Checklist por tela

- [ ] Qual é a pergunta? O veredito responde a ela na primeira linha?
- [ ] Há uma única ação âmbar?
- [ ] Há um único número grande?
- [ ] Nenhum parágrafo passa de uma linha fora de "Detalhes"?
- [ ] Listas com até 5 itens e "Ver todos"?
- [ ] O vermelho só aparece para perigo ou prejuízo?
- [ ] A tela foi validada em 440×956 `?safe=62,0,34,0`, 360×640, 932×430 `?safe=0,62,21,62` e 1440×900?
