'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/hooks/useSSEChat';
import { useI18n } from '@/components/providers/I18nContext';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingMessage?: string;
}

export default function ChatMessageList({
  messages,
  isLoading,
  loadingMessage,
}: ChatMessageListProps) {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const defaultLoading = loadingMessage || t('common.loading');

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Start a conversation
            </h2>
            <p className="text-gray-600">
              Ask questions about your study materials
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-md lg:max-w-2xl px-4 py-3 rounded-lg relative ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {/* Cache hit indicator */}
                {message.cacheHit && (
                  <div
                    className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-md"
                    title={t('chat.cacheHit')}
                  >
                    <svg
                      className="w-4 h-4 text-yellow-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}

                {/* Message content */}
                <div className="pr-6">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>

                  {/* Footer with mode and timestamp */}
                  <div
                    className={`text-xs mt-2 flex items-center gap-2 ${
                      message.role === 'user'
                        ? 'text-indigo-200'
                        : 'text-gray-500'
                    }`}
                  >
                    {message.mode && message.mode !== 'default' && (
                      <span className="bg-opacity-20 px-2 py-0.5 rounded bg-gray-300">
                        {message.mode}
                      </span>
                    )}
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 px-4 py-3 rounded-lg">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{defaultLoading}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
