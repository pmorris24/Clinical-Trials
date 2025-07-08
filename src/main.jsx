import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SisenseContextProvider } from '@sisense/sdk-ui';

// Import CSS files
import './App.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const sisenseUrl = import.meta.env.VITE_SISENSE_URL;
const sisenseToken = import.meta.env.VITE_SISENSE_TOKEN;

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element.');

const root = ReactDOM.createRoot(rootElement);

if (!sisenseUrl || !sisenseToken) {
  root.render(
    <div className="config-error">
      <h1>Application Configuration Error</h1>
      <p>
        The Sisense URL or API Token is not defined in your{' '}
        <code>.env.local</code> file.
      </p>
      <p>
        Please ensure the file exists and contains valid entries, then restart
        your development server.
      </p>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <SisenseContextProvider url={sisenseUrl} token={sisenseToken}>
        <App />
      </SisenseContextProvider>
    </React.StrictMode>
  );
}
