function required(name: string): string {
  const value = process.env[name];
  // Fail at boot, by name. Otherwise a missing secret surfaces much later as
  // a sign-in that "just doesn't work".
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  apiUrl: required("BETTER_AUTH_URL"),
  webUrl: required("WEB_URL"),
};
