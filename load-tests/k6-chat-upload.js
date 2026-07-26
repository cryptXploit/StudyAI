import http from 'k6/http';
import { check, sleep } from 'k6';
import { scenario } from 'k6/execution';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:5000';
const token = __ENV.AUTH_TOKEN;

export const options = {
  scenarios: {
    chat: { executor: 'constant-arrival-rate', rate: 5, timeUnit: '1s', duration: '2m', preAllocatedVUs: 10, maxVUs: 30 },
    upload: { executor: 'constant-arrival-rate', rate: 1, timeUnit: '1s', duration: '2m', preAllocatedVUs: 5, maxVUs: 10, startTime: '10s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2500'],
  },
};

const headers = token ? { Authorization: `Bearer ${token}` } : {};

export default function () {
  if (scenario.name === 'chat') {
    const chat = http.post(
      `${baseUrl}/api/chat`,
      JSON.stringify({ query: 'Explain photosynthesis briefly.', conversationId: `load-${__VU}` }),
      { headers: { ...headers, 'Content-Type': 'application/json' }, tags: { endpoint: 'chat' } }
    );
    check(chat, { 'chat is not server error': (r) => r.status < 500 });
  } else {
    // Upload uses a minimal valid PDF header. Run only with a dedicated staging
    // account because every accepted file creates a queue job.
    const upload = http.post(
      `${baseUrl}/api/upload`,
      { file: http.file('%PDF-1.4\n% load-test\n', 'load-test.pdf', 'application/pdf') },
      { headers, tags: { endpoint: 'upload' } }
    );
    check(upload, { 'upload is accepted or rate-limited': (r) => [202, 200, 401, 403, 429].includes(r.status) });
  }
  sleep(1);
}
