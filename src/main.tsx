import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ensureAndroidNexoraBridge } from './android-nexora';

ensureAndroidNexoraBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
