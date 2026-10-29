import { z } from "zod";

export const replyLabels: Record<string, string> = {
  INTERESTED: "Interessiert",
  NO_NEED: "Derzeit kein Bedarf",
  DO_NOT_CONTACT: "Nicht mehr kontaktieren",
};
export const replyInput = z
  .object({
    revision: z.number().int().positive(),
    outcome: z.enum(["INTERESTED", "NO_NEED", "DO_NOT_CONTACT"]),
    note: z.string().trim().max(5000).default(""),
    followUpOn: z
      .string()
      .default("")
      .refine((value) => {
        if (!value) return true;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(value + "T12:00:00Z");
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      }, "Bitte ein gültiges Datum wählen."),
  })
  .strict();
