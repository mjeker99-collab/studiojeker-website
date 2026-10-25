import { z } from "zod";

const dialogItem = z.object({
  id: z.string().min(1).max(64),
  version: z.number().int().positive(),
});

export const dialogManageInput = z
  .object({
    action: z.enum(["archive", "restore", "delete"]),
    items: z.array(dialogItem).min(1).max(50),
  })
  .strict();
