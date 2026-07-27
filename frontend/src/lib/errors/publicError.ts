import toast from 'react-hot-toast';

export const AI_UNAVAILABLE_MESSAGE = 'Our AI Study Engine is handling high demand right now. Please try again in a few moments.';
export const SERVICE_UNAVAILABLE_MESSAGE = 'We could not complete this request right now. Please try again shortly.';

type PublicErrorPayload = {
  code?: unknown;
  retryable?: unknown;
};

export function getPublicErrorMessage(payload?: PublicErrorPayload | null): string {
  return payload?.code === 'AI_SERVICE_TEMPORARILY_UNAVAILABLE'
    ? AI_UNAVAILABLE_MESSAGE
    : SERVICE_UNAVAILABLE_MESSAGE;
}

export function showPublicError(payload?: PublicErrorPayload | null): void {
  toast.error(getPublicErrorMessage(payload), {
    id: 'prepia-public-service-error',
    duration: 5500,
  });
}