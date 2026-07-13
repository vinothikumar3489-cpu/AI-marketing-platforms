export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  // Handle our custom ApiError (used by fetch-based api client)
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    'status' in error
  ) {
    const apiErr = error as { data: any; message: any; status: number };
    const data = apiErr.data;

    // Backend error object: { code, message, missing, retryable }
    if (data?.error) {
      if (typeof data.error === 'string') return data.error;
      if (typeof data.error?.message === 'string') return data.error.message;
    }
    if (data?.message && typeof data.message === 'string') return data.message;
    if (typeof apiErr.message === 'string') return apiErr.message;
    if (typeof apiErr.message === 'object' && apiErr.message?.message) return apiErr.message.message;
  }

  // Handle AxiosError (legacy)
  const axiosError = error as any;
  if (axiosError?.isAxiosError || axiosError?.response?.data) {
    const responseData = axiosError.response?.data;
    const backendError =
      responseData?.error ??
      responseData?.message;

    if (typeof backendError === 'string') return backendError;
    if (backendError && typeof backendError === 'object' && typeof backendError.message === 'string') return backendError.message;
  }

  if (error instanceof Error) return error.message;

  try {
    const s = String(error);
    if (s && s !== '[object Object]') return s;
  } catch {}

  return 'An unexpected error occurred.';
}

export function getApiErrorCode(error: unknown): string | null {
  const data = (error as any)?.data || (error as any)?.response?.data;
  if (data?.error?.code) return data.error.code;
  if (data?.code) return data.code;
  return null;
}

export function getApiMissingRequirements(error: unknown): string[] {
  const data = (error as any)?.data || (error as any)?.response?.data;
  if (data?.error?.missing && Array.isArray(data.error.missing)) return data.error.missing;
  if (data?.missing && Array.isArray(data.missing)) return data.missing;
  return [];
}
