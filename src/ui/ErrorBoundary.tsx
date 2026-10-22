import { Component, type ReactNode } from 'react';
import { resetTo } from '../state/store';

/**
 * Catches a screen that crashes while drawing, so the phone shows a way out instead of a blank page.
 * Tables are saved on the phone, so reloading picks the game back up.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('GTODuel hit an error:', error);
  }

  private home = (): void => {
    resetTo();
    this.setState({ crashed: false });
  };

  render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="screen">
        <div className="screen-body center" style={{ justifyContent: 'center' }} role="alert">
          <img src="/icons/icon.svg" alt="" width={96} height={96} style={{ borderRadius: 'var(--r-xl)' }} />
          <h1 className="h1">Something went wrong</h1>
          <p className="muted" style={{ margin: 0 }}>
            Your table is saved. Reload and you'll pick up where you left off.
          </p>
        </div>
        <div className="screen-foot">
          <button type="button" className="btn btn-xl btn-green" onClick={() => location.reload()}>
            Reload
          </button>
          <button type="button" className="btn btn-link" onClick={this.home}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }
}
