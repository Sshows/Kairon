import { compare, hash } from "bcryptjs";

export const PASSWORD_MIN_LENGTH = 12;

export function isValidPassword(password: string): boolean {
  // bcrypt ограничен 72 байтами, а не 72 символами: кириллица занимает больше байт.
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

export async function hashPassword(password: string): Promise<string> {
  if (!isValidPassword(password))
    throw new Error("Пароль: минимум 12 символов, максимум 72 байта UTF-8.");
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!isValidPassword(password)) return false;
  return compare(password, passwordHash);
}
