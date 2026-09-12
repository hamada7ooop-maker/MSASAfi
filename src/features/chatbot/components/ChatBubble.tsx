import React from 'react';
import type { ChatMessage } from '@/types';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'system';

  if (isError) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs px-4 py-2 rounded-xl font-bold">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
      <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3.5 shadow-sm text-sm ${
        isUser 
          ? 'bg-[#002b59] text-white rounded-br-sm' 
          : 'bg-white dark:bg-[#1e2124] text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-bl-sm'
      }`}>
        <p className="whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}
