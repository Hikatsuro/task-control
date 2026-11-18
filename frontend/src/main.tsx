import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/roboto';
import '@fontsource-variable/roboto-condensed';
import './styles.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkspaceProvider } from './state/WorkspaceProvider';
import { initializeTheme } from './state/theme';

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WorkspaceProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </WorkspaceProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
