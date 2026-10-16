import { Component } from 'react';
import type { ReactNode } from 'react';
import { useGameStore } from '../../store/game';
import { t } from '../../i18n';

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
          <h2>{t('game.error.title')}</h2>
          <p>{t('game.error.body')}</p>
          <p className="mono hint-sm">{this.state.error.message}</p>
          <div className="event-actions">
            <button
              className="btn primary"
              onClick={() => {
                useGameStore.setState({ screen: 'title', game: null });
                this.setState({ error: null });
              }}
            >
              {t('game.error.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
