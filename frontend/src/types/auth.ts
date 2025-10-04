export type GoogleSignInDto = {
  email: string;
  subject: string;   // sub de Google
  name?: string;
  pictureUrl?: string;
};

export type AuthResponse = {
  token: string;
  expiresInSeconds?: number;
  onboardingRequired?: boolean;
  tenantId?: number;
  name?: string | null;
};
