"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";

export type PipelineGallery = {
  id: string;
  title: string;
  slug: string;
  status: string;
  subtitle: string | null;
  clientLabel: string | null;
  clientSiteBaseUrl: string | null;
  galleryPassword: string | null;
  maxSelects: number | null;
  lockAfterSubmit: boolean;
  allowReopenAfterLock: boolean;
  photoCount: number;
  picksCount: number;
};

const COLUMNS: { id: string; label: string }[] = [
  { id: "DRAFT", label: "Draft" },
  { id: "CLIENT_REVIEWING", label: "Client reviewing" },
  { id: "SELECTIONS_IN", label: "Selections in" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "ARCHIVED", label: "Archived" },
];

function Column({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[280px] flex-1 flex-col rounded-xl border bg-white p-3 shadow-sm transition ${
        isOver ? "border-sky-400 ring-2 ring-sky-100" : "border-stone-200"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">{label}</p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Card({ gallery }: { gallery: PipelineGallery }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: gallery.id,
    data: { gallery },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const subtitle = gallery.subtitle || gallery.title;
  const meta = `${gallery.clientLabel || "Client"} · ${gallery.photoCount} proofs · ${
    gallery.picksCount ? `${gallery.picksCount} picks` : "No picks yet"
  }`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-left shadow-sm active:cursor-grabbing"
    >
      <p className="text-sm font-semibold text-stone-900">{gallery.title}</p>
      <p className="text-xs text-stone-600">{subtitle}</p>
      <p className="mt-1 text-[11px] text-stone-500">{meta}</p>
    </div>
  );
}

export function PipelineBoard({
  galleries,
  onStatusChange,
}: {
  galleries: PipelineGallery[];
  onStatusChange: (galleryId: string, status: string) => Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byColumn = useMemo(() => {
    const m = new Map<string, PipelineGallery[]>();
    for (const c of COLUMNS) m.set(c.id, []);
    for (const g of galleries) {
      const key = COLUMNS.some((c) => c.id === g.status) ? g.status : "DRAFT";
      m.get(key)!.push(g);
    }
    return m;
  }, [galleries]);

  async function handleDragEnd(e: DragEndEvent) {
    const overId = e.over?.id?.toString();
    const gid = e.active.id?.toString();
    setActiveId(null);
    if (!overId || !gid || !COLUMNS.some((c) => c.id === overId)) return;
    await onStatusChange(gid, overId);
  }

  const activeGallery = activeId ? galleries.find((g) => g.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(active.id as string)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-wrap gap-3 lg:flex-nowrap">
        {COLUMNS.map((col) => (
          <Column key={col.id} id={col.id} label={col.label}>
            {(byColumn.get(col.id) ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">—</p>
            ) : (
              (byColumn.get(col.id) ?? []).map((g) => <Card key={g.id} gallery={g} />)
            )}
          </Column>
        ))}
      </div>
      <DragOverlay>
        {activeGallery ? (
          <div className="rounded-lg border border-stone-300 bg-white px-3 py-2 shadow-lg">
            <p className="text-sm font-semibold">{activeGallery.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
