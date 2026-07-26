'use client';

import React, { useState } from 'react';
import { useI18n } from '@/components/providers/I18nContext';

interface ContextPack {
  id: string;
  file_id: string;
  summary: {
    short: string;
    detailed: string;
  };
  key_concepts: Array<{
    concept: string;
    definition: string;
    importance_score: number;
  }>;
  flashcards: Array<{
    question: string;
    answer: string;
    difficulty: string;
  }>;
  quizzes: {
    mcq: Array<any>;
    short_questions: Array<any>;
  };
  generated_at: string;
}

interface ContextPackDisplayProps {
  contextPacks: ContextPack[];
  isLoading?: boolean;
}

export default function ContextPackDisplay({
  contextPacks,
  isLoading = false,
}: ContextPackDisplayProps) {
  const { t, language } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'concepts' | 'flashcards' | 'quiz'>('summary');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>
    );
  }

  if (contextPacks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
        </svg>
        <p className="text-gray-600 text-sm">Upload documents to see summaries and study materials</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {contextPacks.map((pack) => (
        <div key={pack.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
          {/* Header */}
          <div
            onClick={() => setExpandedId(expandedId === pack.id ? null : pack.id)}
            className="p-6 cursor-pointer hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Study Materials
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generated {new Date(pack.generated_at).toLocaleDateString()}
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedId === pack.id ? 'rotate-180' : ''
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedId === pack.id && (
            <div className="border-t border-gray-200">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'concepts', label: 'Concepts' },
                  { id: 'flashcards', label: 'Flashcards' },
                  { id: 'quiz', label: 'Quiz' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-3 font-medium text-sm transition ${
                      activeTab === tab.id
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Quick Summary
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {pack.summary.short}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Detailed Summary
                      </h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {pack.summary.detailed.substring(0, 500)}...
                      </p>
                      <button className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                        Read more
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'concepts' && (
                  <div className="space-y-4">
                    {pack.key_concepts.length > 0 ? (
                      pack.key_concepts.map((concept, idx) => (
                        <div key={idx} className="pb-4 border-b border-gray-100 last:border-0">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">
                              {concept.concept}
                            </h5>
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                              {Math.round(concept.importance_score * 100)}%
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {concept.definition}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No concepts extracted</p>
                    )}
                  </div>
                )}

                {activeTab === 'flashcards' && (
                  <div className="space-y-4">
                    {pack.flashcards.length > 0 ? (
                      pack.flashcards.slice(0, 5).map((card, idx) => (
                        <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900 font-medium mb-2">
                            Q: {card.question}
                          </p>
                          <details className="cursor-pointer">
                            <summary className="text-sm text-blue-700 hover:text-blue-900 font-medium">
                              Show Answer
                            </summary>
                            <p className="mt-2 text-sm text-blue-900">
                              A: {card.answer}
                            </p>
                          </details>
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                            {card.difficulty}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No flashcards generated</p>
                    )}
                    {pack.flashcards.length > 5 && (
                      <button className="w-full py-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium border border-indigo-200 rounded-lg">
                        View all {pack.flashcards.length} flashcards
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'quiz' && (
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">
                        Multiple Choice Questions
                      </h5>
                      {pack.quizzes.mcq.length > 0 ? (
                        <div className="space-y-3">
                          {pack.quizzes.mcq.slice(0, 3).map((q, idx) => (
                            <div key={idx} className="p-3 bg-purple-50 rounded border border-purple-200">
                              <p className="text-sm font-medium text-purple-900">
                                {idx + 1}. {q.question}
                              </p>
                            </div>
                          ))}
                          {pack.quizzes.mcq.length > 3 && (
                            <p className="text-sm text-gray-600">
                              + {pack.quizzes.mcq.length - 3} more MCQ questions
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No quizzes generated</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
                <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm">
                  Study Now
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm">
                  Export
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
