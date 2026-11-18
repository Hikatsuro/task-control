import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/roboto';
import '@fontsource-variable/roboto-condensed';
import './styles.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import { ServerWorkspaceProvider } from './state/ServerWorkspaceProvider';
import { initializeTheme } from './state/theme';

initializeTheme();
const Provider =
  import.meta.env.VITE_DEMO_MODE === 'true' ? WorkspaceProvider : ServerWorkspaceProvider;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
