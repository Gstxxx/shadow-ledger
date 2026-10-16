import { Component } from 'react';
import type { ReactNode } from 'react';
import { useGameStore } from '../../store/game';

/** Keeps a rendering bug from turning the game into a black screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="scrim">
        <div className="event-card tone-bad" role="alertdialog">
          <h2>Falha na operação</h2>
          <p>Algo quebrou na interface. O save automático está guardado; volte ao menu e use Continuar.</p>
          <p className="mono hint-sm">{this.state.error.message}</p>
          <div className="event-actions">
            <button
              className="btn primary"
              onClick={() => {
                useGameStore.setState({ screen: 'title', game: null });
                this.setState({ error: null });
              }}
            >
              Voltar ao menu
            </button>
          </div>
        </div>
      </div>
    );
  }
}
