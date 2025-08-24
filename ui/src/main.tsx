import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import './lib/cacheInit';

const renderApp = () => {
  try {
    const root = createRoot(document.getElementById("root")!);
    root.render(<App />);
  } catch (error) {
    console.error('Failed to render application:', error);
    // Show a friendly error UI
    document.getElementById("root")!.innerHTML = `
      <div style="font-family: system-ui, sans-serif; padding: 2rem; text-align: center;">
        <h1>Something went wrong</h1>
        <p>We're sorry, but there was a problem loading the application.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    `;
  }
};

renderApp();
