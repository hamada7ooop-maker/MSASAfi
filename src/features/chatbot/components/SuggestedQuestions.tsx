import React from 'react';
import { useI18n } from '../../../i18n/index';

export function SuggestedQuestions({ onSelect }: { onSelect: (q: string) => void }) {
  const { t } = useI18n();
  
  // These keys should exist in the legacy translations.js
  const questions = [
    t('chat.q.balance') || 'What is my total balance?',
    t('chat.q.expenses') || 'How much did I spend this month?',
    t('chat.q.budget') || 'Am I over budget?',
    t('chat.q.advice') || 'Give me a financial tip',
  ];

  return (
    <div className="flex flex-col gap-2 p-4 max-w-sm mx-auto">
      {questions.map((q, i) => (
        <button 
          key={i} 
          onClick={() => onSelect(q)}
          className="bg-white dark:bg-[#1e2124] text-[#002b59] dark:text-blue-200 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm font-bold text-left hover:bg-slate-50 dark:hover:bg-[#2a2d30] transition-colors shadow-sm"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
