import axios from 'axios';

export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  const responseData = axios.isAxiosError(error)
    ? error.response?.data
    : null;

  const backendError =
    responseData?.error ??
    responseData?.message ??
    error;

  if (typeof backendError === 'string') {
    return backendError;
  }

  if (
    backendError &&
    typeof backendError === 'object' &&
    typeof backendError.message === 'string'
  ) {
    return backendError.message;
  }

  return 'An unexpected error occurred.';
}

export function getApiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.error?.code) return data.error.code;
    if (data?.code) return data.code;
  }
  return null;
}

export function getApiMissingRequirements(error: unknown): string[] {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.error?.missing && Array.isArray(data.error.missing)) {
      return data.error.missing;
    }
    if (data?.missing && Array.isArray(data.missing)) {
      return data.missing;
    }
  }
  return [];
}
