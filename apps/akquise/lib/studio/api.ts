import { z } from "zod";
import {
  createSeries,
  queueJob,
  runJob,
  applyJob,
  cancelOrReconcile,
} from "./service";
import {
  exportContent,
  exportSeries,
  channelTexts,
  exportMotif,
} from "./render";
import { formats, ORG } from "./input";
import { db } from "../db";
import { contentInput } from "../hub/input";
import { hubActor } from "../hub/workflow";
import { PolicyError } from "../policy";
import { saveAssistantPreferences } from "./context";
export async function studioMutation(
  actor: string,
  path: string[],
  body: unknown,
) {
  const id = path[2];
  if (path[1] === "preferences" && path.length === 2)
    return saveAssistantPreferences(actor, body);
  if (path[1] === "series" && path.length === 2)
    return createSeries(actor, body);
  if (path[1] === "jobs" && path.length === 2) return queueJob(actor, body);
  if (path[1] === "run" && path.length === 3) {
    z.object({ confirmedCosts: z.literal(true) })
      .strict()
      .parse(body);
    return runJob(actor, id);
  }
  if (path[1] === "apply" && path.length === 3) {
    z.object({}).strict().parse(body);
    return applyJob(actor, id);
  }
  if (path[1] === "reconcile" && path.length === 3) {
    z.object({}).strict().parse(body);
    return cancelOrReconcile(actor, id);
  }
  if (path[1] === "export" && path.length === 3) {
    const d = z
      .object({
        version: z.number().int().positive(),
        format: z.enum(formats),
        encoding: z.enum(["png", "jpg"]),
        preview: z.boolean(),
      })
      .strict()
      .parse(body);
    return exportContent(actor, id, d.version, d.format, d.encoding, d.preview);
  }
  if (path[1] === "motif" && path.length === 3) {
    const d = z
      .object({
        version: z.number().int().positive(),
        encoding: z.enum(["png", "jpg"]),
      })
      .strict()
      .parse(body);
    return exportMotif(actor, id, d.version, d.encoding);
  }
  if (path[1] === "zip" && path.length === 3) {
    z.object({}).strict().parse(body);
    return exportSeries(actor, id);
  }
  if (path[1] === "texts" && path.length === 3) {
    const d = z
      .object({ version: z.number().int().positive() })
      .strict()
      .parse(body);
    await db.$transaction((tx) => hubActor(tx, actor));
    const c = await db.marketingContent.findFirst({
      where: { id, organizationId: ORG, version: d.version },
      include: { versions: { where: { version: d.version } } },
    });
    if (!c) throw new PolicyError("Version wurde geändert.", 409);
    return {
      text: channelTexts(contentInput.parse(c.versions[0].payload)),
      name: `${id}-v${d.version}-kanaltexte.txt`,
    };
  }
  throw new PolicyError("Studio-Funktion nicht gefunden.", 404);
}
