import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { client } from './api/client.gen';
import App from './App';
import './styles.scss';

client.setConfig({ baseUrl: import.meta.env.VITE_API_BASE_URL });

// No automatic retries: the pages own their error state and offer an explicit
// Retry, exactly as the Angular client behaved (one request, one outcome).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const container = document.getElementById('root');
if (container === null) {
  throw new Error('missing #root element');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
