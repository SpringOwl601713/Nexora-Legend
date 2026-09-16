import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './overlay-ai.css';
import { ensureAndroidNexoraBridge } from './android-nexora';

ensureAndroidNexoraBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
