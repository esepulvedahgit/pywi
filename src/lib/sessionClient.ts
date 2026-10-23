let csrfToken = '';

export function setCsrfToken(value: string | undefined): void {
  csrfToken = value ?? '';
}

export function getCsrfToken(): string {
  return csrfToken;
}
