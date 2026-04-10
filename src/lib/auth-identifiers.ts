import { appEnv } from "@/config/env";

const loginIdPattern = /[^a-z0-9]+/g;

export const normalizeLoginId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(loginIdPattern, "");

export const buildInternalAuthEmail = (loginId: string) => {
  const normalized = normalizeLoginId(loginId);
  return normalized ? `${normalized}@${appEnv.internalAuthEmailDomain}` : "";
};

export const isInternalAuthEmail = (email: string | null | undefined) =>
  Boolean(
    email &&
      email
        .trim()
        .toLowerCase()
        .endsWith(`@${appEnv.internalAuthEmailDomain}`),
  );
