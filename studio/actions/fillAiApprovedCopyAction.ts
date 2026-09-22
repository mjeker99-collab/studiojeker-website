import { useCallback, useState } from "react";
import { useClient, type DocumentActionComponent } from "sanity";
import { aiPageInitialValues } from "../schemaTypes/aiDefaults";
import {
  fillAiEmptyFields,
  type UnknownRecord,
} from "../lib/fillAiEmptyFields";

const AI_TYPE = "ai";
const API_VERSION = "2025-01-01";

/**
 * Studio action: fill empty KI/AI text fields with the approved /ki copy
 * (aiDefaults). Preserves existing media and non-empty edits.
 * Runs with the logged-in editor’s permissions (no agent API token required).
 */
export const fillAiApprovedCopyAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: API_VERSION });
  const [busy, setBusy] = useState(false);

  const onHandle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const existing = await client.getDocument(props.id);
      if (!existing) {
        // eslint-disable-next-line no-alert
        window.alert(
          `Document ${props.id} not found. Open the KI / AI singleton first.`,
        );
        props.onComplete();
        return;
      }

      const defaults = structuredClone(aiPageInitialValues);
      const { value, filled } = fillAiEmptyFields(existing, defaults);

      if (filled.length === 0) {
        // eslint-disable-next-line no-alert
        window.alert(
          "All approved text fields are already filled. Nothing to write.",
        );
        props.onComplete();
        return;
      }

      const next = value as UnknownRecord;
      const patch: UnknownRecord = { ...next };
      delete patch._id;
      delete patch._type;
      delete patch._rev;
      delete patch._createdAt;
      delete patch._updatedAt;
      delete patch._updatedBy;

      await client
        .patch(props.id)
        .set(patch)
        .commit({ autoGenerateArrayKeys: true });

      // eslint-disable-next-line no-alert
      window.alert(
        `Filled ${filled.length} empty path(s). Review the document, then click Publish.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-alert
      window.alert(`Fill failed: ${message}`);
    } finally {
      setBusy(false);
      props.onComplete();
    }
  }, [busy, client, props]);

  if (props.type !== AI_TYPE) {
    return null;
  }

  return {
    label: busy
      ? "Filling approved /ki copy…"
      : "Fill empty fields from approved /ki copy",
    title:
      "Writes missing DE/EN texts from the freigegebenen Frontend-Inhalt. Existing media and non-empty fields are kept. Review, then Publish.",
    disabled: busy,
    onHandle,
  };
};

export function withFillAiApprovedCopyAction(
  prev: DocumentActionComponent[],
  context: { schemaType: string },
): DocumentActionComponent[] {
  if (context.schemaType !== AI_TYPE) {
    return prev;
  }
  return [...prev, fillAiApprovedCopyAction];
}
