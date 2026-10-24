import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PolicyError } from "../policy";

export const noStore = { "Cache-Control": "no-store" } as const;

export function gptJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

export function gptError(error: unknown) {
  if (error instanceof PolicyError)
    return gptJson({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return gptJson({ error: "Ungültige Anfrage." }, 400);
  console.error("GPT connector error");
  return gptJson({ error: "Anfrage fehlgeschlagen." }, 500);
}
