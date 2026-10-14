/*
  Small, dependency-free validators. Each returns an error *code* (translated
  in the interface, see messages → errors) or null when the value is fine.
*/

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return "required";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "invalid_email";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "required";
  if (password.length < 8) return "weak_password";
  if (password.length > 128) return "invalid_password";
  return null;
}

/** "0555 12-34-56" -> "0555123456"; "00213555123456" -> "+213555123456" */
export function normalizePhone(value: unknown) {
  let phone = String(value ?? "").replace(/[\s.\-()]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  return phone;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return "required";
  if (!/^\+?\d{8,15}$/.test(phone)) return "invalid_phone";
  return null;
}

export function normalizeUltimateCode(value: unknown) {
  return String(value ?? "").trim();
}

export function validateUltimateCode(code: string): string | null {
  if (!code) return "required";
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_/]{2,23}$/.test(code)) return "invalid_ultimate_code";
  return null;
}

export function validateName(name: string): string | null {
  if (!name) return "required";
  if (name.length < 2 || name.length > 80) return "invalid_name";
  return null;
}

/** Parses "101, 105 108\n110" into unique member numbers. */
export function parseCodes(input: string): { codes: number[]; invalid: string[] } {
  const parts = input
    .split(/[\s,;،]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const codes: number[] = [];
  const invalid: string[] = [];
  for (const part of parts) {
    if (/^\d{1,9}$/.test(part)) {
      const n = Number(part);
      if (!codes.includes(n)) codes.push(n);
    } else {
      invalid.push(part);
    }
  }
  return { codes, invalid };
}

/** Identifier typed on the login form: a member number or an e-mail. */
export function classifyIdentifier(raw: string):
  | { kind: "code"; code: number }
  | { kind: "email"; email: string } {
  const value = raw.trim();
  if (/^\d{3,9}$/.test(value)) return { kind: "code", code: Number(value) };
  return { kind: "email", email: value.toLowerCase() };
}
