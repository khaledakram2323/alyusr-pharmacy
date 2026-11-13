import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { InboxProvider } from './context/InboxContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
    <LanguageProvider>
      <CatalogProvider>
        <InboxProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </InboxProvider>
      </CatalogProvider>
    </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
