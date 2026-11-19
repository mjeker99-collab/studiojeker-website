"use client";
import { useState } from "react";
import type { LibraryState } from "./Library";
import { libraryApi } from "./Library";
import { folderLabel, folderPath, folderVisible } from "@/lib/library/tree";

type Folder = LibraryState["folders"][number];
export function FolderOptions({
  state,
  exclude,
}: {
  state: LibraryState;
  exclude?: string;
}) {
  return (
    <>
      <option value="">Bibliothek (oberste Ebene)</option>
      {state.folders
        .filter(
          (f) =>
            folderVisible(state.folders, f.id) &&
            !folderPath(state.folders, f.id).some((p) => p.id === exclude),
        )
        .map((f) => (
          <option key={f.id} value={f.id}>
            {folderLabel(state.folders, f.id)}
          </option>
        ))}
    </>
  );
}
export default function Folders({
  state,
  folderId,
  onNavigate,
  busy = false,
  action,
  trash = false,
  onTrash,
  onDrop,
}: {
  state: LibraryState;
  folderId: string | null;
  onNavigate: (id: string | null) => void;
  busy?: boolean;
  action?: (fn: () => Promise<void>) => Promise<void>;
  trash?: boolean;
  onTrash?: (value: boolean) => void;
  onDrop?: (itemId: string, folderId: string | null) => void;
}) {
  const [edit, setEdit] = useState<{
    id?: string;
    revision?: number;
    name: string;
    parentId: string | null;
    customerId: string | null;
    projectId: string | null;
  } | null>(null);
  const current = state.folders.find((f) => f.id === folderId);
  const navigate = (id: string | null) => {
    setEdit(null);
    onNavigate(id);
  };
  const children = state.folders.filter((f) =>
    trash
      ? f.deletedAt && folderVisible(state.folders, f.parentId)
      : f.parentId === folderId && folderVisible(state.folders, f.id),
  );
  const remove = (f: Folder, restore: boolean) => {
    if (
      !action ||
      (!restore &&
        !window.confirm(
          `Ordner «${f.name}» mit allen Unterordnern und Inhalten in den Papierkorb verschieben? Bestehende Verwendungen bleiben erhalten.`,
        ))
    )
      return;
    void action(async () => {
      await libraryApi("trash", {
        id: f.id,
        revision: f.revision,
        type: "folder",
        restore,
      });
      setEdit(null);
      if (!restore && folderId === f.id) onNavigate(f.parentId);
    });
  };
  return (
    <section className="library-folders" aria-label="Ordner">
      <nav className="library-breadcrumb" aria-label="Ordnerpfad">
        <button
          disabled={busy}
          onClick={() => {
            onTrash?.(false);
            navigate(null);
          }}
          onDragOver={(e) => {
            if (onDrop) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            onDrop?.(e.dataTransfer.getData("text/studioone-item"), null);
          }}
        >
          Bibliothek
        </button>
        {!trash &&
          folderPath(state.folders, folderId).map((f) => (
            <span key={f.id}>
              {" "}
              /{" "}
              <button
                disabled={busy}
                aria-current={f.id === folderId ? "page" : undefined}
                onClick={() => navigate(f.id)}
              >
                {f.name}
              </button>
            </span>
          ))}
        {trash && <span aria-current="page"> / Papierkorb</span>}
      </nav>
      {action && (
        <div className="library-folder-actions">
          {!trash && (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                setEdit({
                  name: "",
                  parentId: folderId,
                  customerId: null,
                  projectId: null,
                })
              }
            >
              Neuer Ordner
            </button>
          )}
          {!trash && current && (
            <button
              disabled={busy}
              onClick={() =>
                setEdit({
                  id: current.id,
                  revision: current.revision,
                  name: current.name,
                  parentId: current.parentId,
                  customerId: current.customerId,
                  projectId: current.projectId,
                })
              }
            >
              Ordner bearbeiten
            </button>
          )}
          {!trash && current && (
            <button disabled={busy} onClick={() => remove(current, false)}>
              Ordner löschen
            </button>
          )}
          <button
            disabled={busy}
            aria-pressed={trash}
            onClick={() => {
              setEdit(null);
              onTrash?.(!trash);
            }}
          >
            {" "}
            {trash ? "Zurück zu den Ordnern" : "Papierkorb"}
          </button>
        </div>
      )}
      {edit && action && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await libraryApi("folder", edit);
              setEdit(null);
            });
          }}
        >
          <h3>{edit.id ? "Ordner bearbeiten" : "Neuer Ordner"}</h3>
          <label>
            Ordnername
            <input
              autoFocus
              required
              maxLength={120}
              value={edit.name}
              placeholder="Zum Beispiel Kunde oder Projekt"
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
          </label>
          <label>
            Ablageort
            <select
              value={edit.parentId || ""}
              onChange={(e) =>
                setEdit({ ...edit, parentId: e.target.value || null })
              }
            >
              <FolderOptions state={state} exclude={edit.id} />
            </select>
          </label>
          <details>
            <summary>Kunde oder Projekt zuordnen (optional)</summary>
            <label>
              Kunde
              <select
                value={edit.customerId || ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    customerId: e.target.value || null,
                    projectId: null,
                  })
                }
              >
                <option value="">Keine eigene Zuordnung</option>
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Projekt
              <select
                value={edit.projectId || ""}
                onChange={(e) => {
                  const p = state.projects.find((p) => p.id === e.target.value);
                  setEdit({
                    ...edit,
                    projectId: p?.id || null,
                    customerId: p?.customerId || edit.customerId,
                  });
                }}
              >
                <option value="">Keine eigene Zuordnung</option>
                {state.projects
                  .filter(
                    (p) =>
                      !edit.customerId ||
                      !p.customerId ||
                      p.customerId === edit.customerId,
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </label>
          </details>
          <div className="library-folder-actions">
            <button disabled={busy}>Ordner speichern</button>
            <button type="button" disabled={busy} onClick={() => setEdit(null)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}
      <div className="library-folder-grid">
        {children.map((f) => (
          <div
            className="library-folder-card"
            key={f.id}
            onDragOver={(e) => {
              if (!trash && onDrop) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!trash)
                onDrop?.(e.dataTransfer.getData("text/studioone-item"), f.id);
            }}
          >
            {trash ? (
              <>
                <strong>{f.name}</strong>
                <small>{folderLabel(state.folders, f.parentId)}</small>
                <button disabled={busy} onClick={() => remove(f, true)}>
                  Ordner wiederherstellen
                </button>
              </>
            ) : (
              <button disabled={busy} onClick={() => navigate(f.id)}>
                <span aria-hidden="true">▱ </span>
                <strong>{f.name}</strong>
                <small>
                  {state.customers.find((c) => c.id === f.customerId)?.name ||
                    state.projects.find((p) => p.id === f.projectId)?.title ||
                    "Ordner öffnen"}
                </small>
              </button>
            )}
          </div>
        ))}
      </div>
      {!trash && !children.length && !folderId && (
        <p>
          Lege Ordner nach Kunde oder Projekt an. Unterordner erstellst du im
          geöffneten Ordner.
        </p>
      )}
      {trash && (
        <p>
          Gelöschte Ordner werden mitsamt ihren Inhalten wiederhergestellt.
          Originaldateien und bestehende Verwendungen bleiben erhalten.
        </p>
      )}
    </section>
  );
}
