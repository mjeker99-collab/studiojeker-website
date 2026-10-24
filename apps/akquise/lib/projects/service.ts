import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { PolicyError } from "../policy";

export const projectArea = z.enum([
  "Kampagnen",
  "Social Media",
  "Website",
  "Content-Studio",
  "Konzepte",
  "Website-Studio",
  "Content-Editor",
]);
const input = z
  .object({
    area: projectArea,
    title: z.string().trim().min(1).max(200),
    revision: z.number().int().positive().optional(),
    payload: z.record(z.string(), z.json()),
  })
  .strict();

export async function projectDrafts(actor: string, area: unknown, id?: string) {
  const scope = projectArea.parse(area);
  await db.$transaction((tx) => hubActor(tx, actor));
  if (id) {
    const draft = await db.projectDraft.findFirst({
      where: { id, userId: actor, area: scope },
    });
    if (!draft) throw new PolicyError("Projekt nicht gefunden.", 404);
    return draft;
  }
  return db.projectDraft.findMany({
    where: { userId: actor, area: scope },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, revision: true, updatedAt: true },
  });
}
export async function saveProjectDraft(
  actor: string,
  raw: unknown,
  id?: string,
) {
  const data = input.parse(raw);
  if (Buffer.byteLength(JSON.stringify(data.payload)) > 1000000)
    throw new PolicyError("Projekt ist zu gross zum Sichern.", 413);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const payload = data.payload as Prisma.InputJsonObject;
    if (!id)
      return tx.projectDraft.create({
        data: { userId: actor, area: data.area, title: data.title, payload },
      });
    const changed = await tx.projectDraft.updateMany({
      where: {
        id,
        userId: actor,
        area: data.area,
        revision: data.revision ?? -1,
      },
      data: { title: data.title, payload, revision: { increment: 1 } },
    });
    if (!changed.count)
      throw new PolicyError(
        "Projekt wurde anderswo geändert. Öffne den gespeicherten Stand oder sichere deine Arbeit als Kopie.",
        409,
      );
    return tx.projectDraft.findUniqueOrThrow({ where: { id } });
  });
}
