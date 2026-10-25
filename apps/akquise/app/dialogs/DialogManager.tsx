"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  isManagedDialog,
  workspaceLabels,
  type ContentWorkspace,
} from "@/lib/hub/workspace";

export type DialogManagerItem = {
  id: string;
  title: string;
  version: number;
  kind: string;
  workspace?: string | null;
  campaignId?: string | null;
  archivedAt?: string | Date | null;
};

type ConfirmState = {
  action: "delete" | "archive" | "restore";
  items: DialogManagerItem[];
};

export type DialogManagerProps = {
  items: DialogManagerItem[];
  campaignName?: (campaignId: string | null | undefined) => string;
  campaigns?: { id: string; title: string }[];
  busy?: boolean;
  /** When false, destructive controls stay hidden (unauthorized session). */
  canManage?: boolean;
  showPromote?: boolean;
  onPromote?: (
    item: DialogManagerItem,
    campaignId?: string | null,
  ) => void | Promise<void>;
  onOpen?: (item: DialogManagerItem) => void;
  onManage: (
    action: "archive" | "restore" | "delete",
    items: DialogManagerItem[],
  ) => void | Promise<void>;
  heading?: string;
  description?: string;
  emptyLabel?: string;
  regionLabel?: string;
  compact?: boolean;
};

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ConfirmDialog({
  state,
  busy,
  onCancel,
  onConfirm,
}: {
  state: ConfirmState;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current
      ?.querySelector<HTMLElement>("button:not([data-cancel])")
      ?.focus();
    return () => previous?.focus();
  }, []);
  const labels = state.items.map((i) => i.title);
  const headline =
    state.action === "delete"
      ? state.items.length === 1
        ? `Dialog «${labels[0]}» endgültig löschen?`
        : `${state.items.length} Dialoge endgültig löschen?`
      : state.action === "archive"
        ? state.items.length === 1
          ? `Dialog «${labels[0]}» archivieren?`
          : `${state.items.length} Dialoge archivieren?`
        : state.items.length === 1
          ? `Dialog «${labels[0]}» wiederherstellen?`
          : `${state.items.length} Dialoge wiederherstellen?`;
  const detail =
    state.action === "delete"
      ? "Nur der gewählte GPT-Dialog bzw. Content-Entwurf wird gelöscht. Kampagnen, Projekte, Medien und unabhängig gespeicherte Social Posts bleiben erhalten."
      : state.action === "archive"
        ? "Archivierte Dialoge verschwinden aus der aktiven Liste und können über den Archiv-Filter wiederhergestellt werden."
        : "Der Dialog erscheint wieder in der aktiven Liste «Zur Übernahme».";
  return (
    <section
      ref={dialog}
      className="dialog-manager-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
        if (e.key === "Tab") {
          const nodes = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled)",
            ) || [],
          );
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="dialog-manager-confirm-inner panel padded">
        <h3 id={titleId}>{headline}</h3>
        <p>{detail}</p>
        {state.items.length > 1 && (
          <ul className="dialog-manager-confirm-list">
            {state.items.map((item) => (
              <li key={item.id}>«{item.title}»</li>
            ))}
          </ul>
        )}
        <div className="actions">
          <button
            type="button"
            className={state.action === "delete" ? "danger" : undefined}
            disabled={busy}
            onClick={onConfirm}
          >
            {state.action === "delete"
              ? "Endgültig löschen"
              : state.action === "archive"
                ? "Archivieren"
                : "Wiederherstellen"}
          </button>
          <button
            type="button"
            className="secondary"
            data-cancel=""
            disabled={busy}
            onClick={onCancel}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Shared GPT dialog / Content draft management for Social Media «Zur Übernahme»,
 * StudioChat and related campaign / Content Studio surfaces.
 */
export default function DialogManager({
  items,
  campaignName = () => "Ohne Kampagne",
  campaigns = [],
  busy = false,
  canManage = true,
  showPromote = true,
  onPromote,
  onOpen,
  onManage,
  heading = "Zur Übernahme",
  description = "Content-Entwürfe und GPT-Dialoge bleiben gespeichert. Übernahme verschiebt sie nur in die Publishing-Liste. Archivieren und Löschen betreffen ausschliesslich den gewählten Dialog.",
  emptyLabel = "Keine Dialoge in dieser Ansicht.",
  regionLabel = "Zur Übernahme in Social Media",
  compact = false,
}: DialogManagerProps) {
  const [archiveView, setArchiveView] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [localError, setLocalError] = useState("");
  const [promoteCampaign, setPromoteCampaign] = useState<
    Record<string, string>
  >({});

  const managed = items.filter(isManagedDialog);
  const visible = managed.filter((item) =>
    archiveView ? !!item.archivedAt : !item.archivedAt,
  );
  const allSelected =
    visible.length > 0 && visible.every((item) => selected.has(item.id));
  const selectedItems = visible.filter((item) => selected.has(item.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visible.map((item) => item.id)));
  }

  function setArchiveFilter(next: boolean) {
    setArchiveView(next);
    setSelected(new Set());
    setLocalError("");
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runConfirmed() {
    if (!confirm) return;
    setLocalError("");
    try {
      await onManage(confirm.action, confirm.items);
      setConfirm(null);
      setSelected(new Set());
    } catch (e) {
      setLocalError(
        e instanceof Error
          ? e.message
          : "Aktion fehlgeschlagen. Bitte erneut versuchen.",
      );
    }
  }

  if (!managed.length && !archiveView) return null;

  return (
    <section
      className={
        compact
          ? "panel padded social-promote dialog-manager dialog-manager-compact"
          : "panel padded social-promote dialog-manager"
      }
      aria-label={regionLabel}
    >
      <div className="dialog-manager-header">
        <div>
          <h2>{heading}</h2>
          {!compact && <p>{description}</p>}
        </div>
        <div className="dialog-manager-filters" role="group" aria-label="Dialogfilter">
          <button
            type="button"
            className={archiveView ? "secondary" : undefined}
            aria-pressed={!archiveView}
            disabled={busy}
            onClick={() => setArchiveFilter(false)}
          >
            Aktiv
          </button>
          <button
            type="button"
            className={archiveView ? undefined : "secondary"}
            aria-pressed={archiveView}
            disabled={busy}
            onClick={() => setArchiveFilter(true)}
          >
            Archiv
          </button>
        </div>
      </div>

      {localError && (
        <p role="alert" className="error">
          {localError}
        </p>
      )}

      {canManage && !!visible.length && (
        <div className="dialog-manager-toolbar actions">
          <label className="dialog-manager-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={busy}
              onChange={toggleAll}
            />
            Alle auswählen
          </label>
          {!archiveView ? (
            <>
              <button
                type="button"
                className="secondary"
                disabled={busy || !selectedItems.length}
                onClick={() =>
                  setConfirm({ action: "archive", items: selectedItems })
                }
              >
                Ausgewählte archivieren
              </button>
              <button
                type="button"
                className="danger"
                disabled={busy || !selectedItems.length}
                onClick={() =>
                  setConfirm({ action: "delete", items: selectedItems })
                }
              >
                <TrashIcon />
                Ausgewählte löschen
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || !selectedItems.length}
                onClick={() =>
                  setConfirm({ action: "restore", items: selectedItems })
                }
              >
                Ausgewählte wiederherstellen
              </button>
              <button
                type="button"
                className="danger"
                disabled={busy || !selectedItems.length}
                onClick={() =>
                  setConfirm({ action: "delete", items: selectedItems })
                }
              >
                <TrashIcon />
                Ausgewählte löschen
              </button>
            </>
          )}
        </div>
      )}

      <div className="hub-cards">
        {visible.map((c) => {
          const workspace = (c.workspace ||
            "CONTENT_DRAFT") as ContentWorkspace;
          return (
            <article className="panel padded dialog-manager-card" key={c.id}>
              <div className="dialog-manager-card-top">
                {canManage && (
                  <label className="dialog-manager-check">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      disabled={busy}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`«${c.title}» auswählen`}
                    />
                  </label>
                )}
                <div className="dialog-manager-card-body">
                  <p className="eyebrow">{workspaceLabels[workspace]}</p>
                  <h3>{c.title}</h3>
                  <p className="muted">
                    {campaignName(c.campaignId)} · V{c.version}
                    {c.archivedAt ? " · Archiviert" : ""}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="danger dialog-manager-trash"
                    disabled={busy}
                    aria-label={`«${c.title}» löschen`}
                    title="Löschen"
                    onClick={() =>
                      setConfirm({ action: "delete", items: [c] })
                    }
                  >
                    <TrashIcon />
                    <span>Löschen</span>
                  </button>
                )}
              </div>
              {!archiveView && showPromote && onPromote && !!campaigns.length && (
                <label className="dialog-manager-campaign">
                  Kampagne bei Übernahme
                  <select
                    value={
                      promoteCampaign[c.id] ?? c.campaignId ?? ""
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setPromoteCampaign((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Ohne Kampagne</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="actions">
                {!archiveView && showPromote && onPromote && (
                  <button
                    type="button"
                    className={compact ? "ai-button" : undefined}
                    disabled={busy}
                    onClick={() => {
                      // Explicit select change → pass value (incl. null).
                      // Otherwise omit so the API keeps content / inherits series.
                      const chosen =
                        promoteCampaign[c.id] !== undefined
                          ? promoteCampaign[c.id] || null
                          : undefined;
                      void onPromote(c, chosen);
                    }}
                  >
                    {compact
                      ? `«${c.title}» in Social Media übernehmen`
                      : "In Social Media übernehmen"}
                  </button>
                )}
                {!archiveView && onOpen && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => onOpen(c)}
                  >
                    Vorher öffnen
                  </button>
                )}
                {canManage &&
                  (archiveView ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setConfirm({ action: "restore", items: [c] })
                      }
                    >
                      Wiederherstellen
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        setConfirm({ action: "archive", items: [c] })
                      }
                    >
                      Archivieren
                    </button>
                  ))}
              </div>
            </article>
          );
        })}
        {!visible.length && <p className="empty">{emptyLabel}</p>}
      </div>

      {confirm && (
        <ConfirmDialog
          state={confirm}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runConfirmed()}
        />
      )}
    </section>
  );
}
