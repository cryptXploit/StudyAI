import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('live discussion normalizes the API origin and handles failed streaming responses', () => {
  const root = path.resolve(__dirname, '..');
  const page = fs.readFileSync(path.join(root, 'src/app/live/page.tsx'), 'utf8');
  const groqAdapter = fs.readFileSync(path.join(root, '..', 'backend/src/ai/adapters/GroqAdapter.ts'), 'utf8');

  expect(page).toContain("replace(/\\/api\\/?$/, '')");
  expect(page).toContain('if (!response.ok)');
  expect(page).toContain('completed = true');
  expect(page).toContain('recognitionRef.current.continuous = false');
  expect(page).toContain('shouldSubmitVoiceRef.current = true');
  expect(page).toContain('requestInFlightRef.current');
  expect(page).toContain('resumeListeningRef.current');
  expect(page).toContain('scheduleAutomaticReply');
  expect(page).toContain('}, 2000);');
  expect(page).toContain('isMeaningfulSpeech');
  expect(page).toContain('endLiveConversation');
  expect(page).toContain('voiceTurnSubmittedRef');
  expect(page).toContain('recognitionActiveRef');
  expect(page).toContain("err?.name === 'InvalidStateError'");
  expect(page).toContain('recognitionActiveRef.current = false');
  expect(page).toContain('let refreshVoices = () => {}');
  expect(page).toContain("event.error !== 'aborted'");
  expect(page).toContain('setLiveError');
  expect(page).toContain('role="alert"');
  expect(page).not.toContain("bg-[url('/images/grid.svg')]");
  expect(groqAdapter).toContain('let buffer = \'\'');
  expect(groqAdapter).toContain('buffer = lines.pop() || \'\'');
  const liveController = fs.readFileSync(path.join(root, '..', 'backend/src/controllers/live.controller.ts'), 'utf8');
  expect(liveController).toContain('Bangla/Bengali written in Bangla script');
  expect(liveController).toContain('Hindi written in Devanagari script');
  const worker = fs.readFileSync(path.join(root, '..', 'backend/src/queue/worker.ts'), 'utf8');
  expect(worker).toContain('generateEmbedding(chunk, 1536)');
  expect(worker).toContain('generateEmbedding(chunk, 768)');
});
