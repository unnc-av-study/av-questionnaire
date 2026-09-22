import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import QuestionnaireClient from './questionnaire-client';
import './globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QuestionnaireClient />
  </StrictMode>,
);
