import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ошибка интерфейса TaskControl', error, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <main className="recovery-page">
        <h1>Не удалось открыть страницу</h1>
        <p>Обновите приложение. Сохранённые данные останутся в браузере.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
