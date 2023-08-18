import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../components/app';
import '~/styles/main.postcss'
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);