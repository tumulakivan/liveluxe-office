import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

/** An error whose message is safe, and meant, to show the person who caused it. */
export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, issue?.message ?? "That request was not valid.");
  }
  return result.data;
}

export function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, "Not found.");
  return id;
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  // Malformed JSON bodies arrive from express.json() as a 400 SyntaxError.
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ error: "That request was not valid JSON." });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong on our side. Try again." });
}

// ---------------------------------------------------------------- shared schemas

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "That password is too long.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(80, "Keep the name under 80 characters.");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usernames need at least 3 characters.")
  .max(40, "Keep usernames under 40 characters.")
  .regex(
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
    "Usernames can use letters, numbers, and single dots, dashes or underscores between them.",
  );
