# Web e celular desde o início

O jogo sai primeiro na web (site próprio e itch.io) e depois como PWA instalável e app de celular. Por isso a interface é desenhada desde já para funcionar com toque e em tela pequena, não só no desktop. Decidimos assim porque adaptar depois uma interface densa de desktop (mapa com painéis laterais fixos, hover, cliques pequenos) para toque custaria quase uma reescrita da UI.

## Considered Options

- **Só web/desktop, com Steam via Tauri depois:** público mais natural para o gênero, mas fecha o celular sem uma segunda interface.

## Consequences

- Nada de informação essencial só no hover; alvos de toque com pelo menos 44 px; painéis viram gavetas e folhas inferiores em tela estreita.
- O save não depende de servidor e pode ser exportado e importado.
- Uma versão desktop/Steam continua possível empacotando o mesmo código.
