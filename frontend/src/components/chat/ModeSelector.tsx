'use client';

import React from 'react';
import { useI18n } from '@/components/providers/I18nContext';
import { ChatMode } from '@/hooks/useSSEChat';

interface ModeSelectorProps {
  selectedMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

export default function ModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: ModeSelectorProps) {
  const { t } = useI18n();

  const modes: { value: ChatMode; label: string; icon: string; description: string }[] = [
    {
      value: 'default',
      label: t('chat.mode.default'),
      icon: '💬',
      description: t('chat.mode.default.desc'),
    },
    {
      value: 'summary',
      label: t('chat.mode.summary'),
      icon: '📋',
      description: t('chat.mode.summary.desc'),
    },
    {
      value: 'quiz',
      label: t('chat.mode.quiz'),
      icon: '❓',
      description: t('chat.mode.quiz.desc'),
    },
    {
      value: 'deep-dive',
      label: t('chat.mode.deep'),
      icon: '🔬',
      description: t('chat.mode.deep.desc'),
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">
        {t('chat.selectMode')}
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:flex lg:gap-2">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            disabled={disabled}
            className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
              selectedMode === mode.value
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={mode.description}
          >
            <span className="text-lg">{mode.icon}</span>
            <p className="text-xs font-medium mt-1">{mode.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
