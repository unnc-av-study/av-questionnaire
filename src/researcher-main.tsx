import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ResearcherObservation from './researcher-observation';
import './globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ResearcherObservation />
  </StrictMode>,
);
