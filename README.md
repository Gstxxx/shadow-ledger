# Shadow Ledger

**Jogue no navegador:** https://shadow-ledger-delta.vercel.app

Você é o Diretor de uma agência privada de inteligência. Voa o mundo com sua Frota de cargueiros, compra armas, informação e mercenários onde a guerra é barata e vende onde ela paga caro. Abre Estações, monta Equipes e decide até onde vai: um roubo de tecnologia aqui, um Golpe ali. Cada passo deixa rastro, e o mundo inteiro está ficando mais tenso.

Estratégia em tempo contínuo com pausa, para navegador e celular (jogado deitado). É um remake com identidade própria das mecânicas de *Guns Girls Lawyers Spies* (2006): todos os nomes, textos, arte e sons são novos.

## O jogo

- **Comércio com Saturação:** os preços de 55 países reais reagem à política (guerra, guerra civil, sanções) e às suas próprias vendas.
- **Estações:** de Célula a Base, geram renda, mostram preços e defendem a si mesmas.
- **Equipes:** Pessoal destacado que age em outro país enquanto você está longe.
- **Reputação e Exposição:** como cada governo te vê e quanta atenção você chamou. A Exposição gera Ameaças anunciadas: batidas, processos, ataques.
- **Combate em grade** jurídico, urbano, militar ou aéreo, com Prévia de chance de vitória e Tática.
- **Agências Rivais** que jogam pelas mesmas regras.
- **Tensão Global:** guerras e operações empurram o mundo para o abismo. No topo, abre-se o mercado mais lucrativo e mais perigoso do jogo. Se ninguém parar, vem a Crise Final, e todos perdem.

## Desenvolvimento

```bash
npm install
npm run dev
```

```bash
npm test
```

- Glossário do domínio: [CONTEXT.md](CONTEXT.md)
- Decisões de arquitetura: [docs/adr/](docs/adr/)
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Deploy: [docs/DEPLOY.md](docs/DEPLOY.md)

Stack: Vite, React 18, TypeScript, zustand, d3-geo e world-atlas, GSAP, Web Audio. Toda a arte, a música e os efeitos são gerados por código.
