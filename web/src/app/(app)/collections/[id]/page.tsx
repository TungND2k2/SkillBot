import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, ArrowLeft, LayoutGrid, Rows3, Columns3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/page-header";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  inferKind,
  formatValue,
  statusTone,
  type FieldKind,
} from "@/lib/format";
import type { CollectionFieldDto, CollectionRowDto } from "@shared/dto";

type ViewMode = "kanban" | "cards" | "table";

interface FieldMeta extends CollectionFieldDto {
  kind: FieldKind;
}

function buildFieldMeta(
  fields: CollectionFieldDto[],
  rows: CollectionRowDto[],
): FieldMeta[] {
  // Union of declared fields + any extra keys observed on rows.
  const declared = new Set(fields.map((f) => f.name));
  const extra: CollectionFieldDto[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row.data)) {
      if (!declared.has(k)) {
        declared.add(k);
        extra.push({ name: k });
      }
    }
  }
  return [...fields, ...extra].map((f) => {
    const sample = rows[0]?.data[f.name];
    return { ...f, kind: inferKind(f.name, f.type, sample) };
  });
}

function StatusBadge({ value }: { value: unknown }) {
  const { bg, fg } = statusTone(value);
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${bg} ${fg}`}>
      {String(value)}
    </span>
  );
}

function CellValue({ field, value }: { field: FieldMeta; value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  switch (field.kind) {
    case "id":
      return <span className="font-mono text-xs">{String(value)}</span>;
    case "title":
      return <span className="font-medium">{String(value)}</span>;
    case "status":
      return <StatusBadge value={value} />;
    case "money":
    case "number":
      return <span className="font-mono tabular-nums">{formatValue(field.kind, value)}</span>;
    case "date":
      return <span className="text-muted-foreground">{formatValue(field.kind, value)}</span>;
    case "long-text":
      return <span className="line-clamp-2">{String(value)}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

// ── View: cards ───────────────────────────────────────────────

function CardsView({
  rows,
  fields,
  titleField,
  statusField,
}: {
  rows: CollectionRowDto[];
  fields: FieldMeta[];
  titleField: FieldMeta | null;
  statusField: FieldMeta | null;
}) {
  const otherFields = fields.filter(
    (f) => f.name !== titleField?.name && f.name !== statusField?.name,
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <Card key={row.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {titleField && (
                  <p className="font-semibold truncate">
                    {String(row.data[titleField.name] ?? "—")}
                  </p>
                )}
                {fields.find((f) => f.kind === "id" && f.name !== titleField?.name) && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {String(row.data[fields.find((f) => f.kind === "id" && f.name !== titleField?.name)!.name] ?? "")}
                  </p>
                )}
              </div>
              {statusField && row.data[statusField.name] !== undefined && (
                <StatusBadge value={row.data[statusField.name]} />
              )}
            </div>

            <dl className="space-y-1.5 text-sm">
              {otherFields.slice(0, 5).map((f) => {
                const v = row.data[f.name];
                if (v === null || v === undefined || v === "") return null;
                return (
                  <div key={f.name} className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-muted-foreground capitalize truncate">
                      {f.label ?? f.name}
                    </dt>
                    <dd className="text-right truncate">
                      <CellValue field={f} value={v} />
                    </dd>
                  </div>
                );
              })}
            </dl>

            {row.createdByName && (
              <p className="pt-2 border-t text-xs text-muted-foreground">
                {row.createdByName} · {new Date(row.createdAt).toLocaleDateString("vi-VN")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── View: kanban ──────────────────────────────────────────────

function KanbanView({
  rows,
  fields,
  titleField,
  statusField,
}: {
  rows: CollectionRowDto[];
  fields: FieldMeta[];
  titleField: FieldMeta | null;
  statusField: FieldMeta;
}) {
  // Group by status
  const groups = new Map<string, CollectionRowDto[]>();
  for (const row of rows) {
    const key = String(row.data[statusField.name] ?? "(không có)");
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }
  const columns = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  const detailFields = fields.filter(
    (f) => f.name !== titleField?.name && f.name !== statusField.name,
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(([status, items]) => {
        const tone = statusTone(status);
        return (
          <div key={status} className="flex-shrink-0 w-72">
            <div className={`rounded-lg ${tone.bg} ${tone.fg} px-3 py-2 mb-3 flex items-center justify-between`}>
              <span className="font-medium text-sm truncate">{status}</span>
              <span className="text-xs font-mono opacity-80">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((row) => (
                <Card key={row.id} className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer">
                  <CardContent className="p-3 space-y-2">
                    {titleField && (
                      <p className="font-semibold text-sm truncate">
                        {String(row.data[titleField.name] ?? "—")}
                      </p>
                    )}
                    <div className="space-y-1">
                      {detailFields.slice(0, 4).map((f) => {
                        const v = row.data[f.name];
                        if (v === null || v === undefined || v === "") return null;
                        return (
                          <div key={f.name} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground truncate">
                              {f.label ?? f.name}
                            </span>
                            <span className="truncate text-right max-w-[60%]">
                              <CellValue field={f} value={v} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground text-center">
                  Trống
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── View: table ───────────────────────────────────────────────

function TableView({
  rows,
  fields,
}: {
  rows: CollectionRowDto[];
  fields: FieldMeta[];
}) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => (
                <TableHead key={f.name} className="whitespace-nowrap">
                  {f.label ?? f.name}
                </TableHead>
              ))}
              <TableHead className="text-right whitespace-nowrap">Cập nhật</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {fields.map((f) => (
                  <TableCell key={f.name} className="whitespace-nowrap">
                    <CellValue field={f} value={row.data[f.name]} />
                  </TableCell>
                ))}
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(row.updatedAt).toLocaleDateString("vi-VN")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────

const VIEWS: Record<ViewMode, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  kanban: { label: "Kanban", icon: Columns3 },
  cards:  { label: "Thẻ",    icon: LayoutGrid },
  table:  { label: "Bảng",   icon: Rows3 },
};

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  const { collection, rows } = await api.getCollectionRows(id);
  const fields = buildFieldMeta(collection.fields, rows);
  const titleField =
    fields.find((f) => f.kind === "title") ??
    fields.find((f) => f.kind === "id") ??
    fields[0] ??
    null;
  const statusField = fields.find((f) => f.kind === "status") ?? null;

  const requestedView = typeof sp.view === "string" ? (sp.view as ViewMode) : null;
  const view: ViewMode =
    requestedView && VIEWS[requestedView]
      ? requestedView
      : statusField
        ? "kanban"
        : "cards";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/collections" />}>
        <ArrowLeft className="size-4" />
        <span className="ml-1">Bảng dữ liệu</span>
      </Button>

      <PageHeader
        icon={Database}
        title={collection.name}
        description={collection.description ?? `Bảng /${collection.slug}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {rows.length} dòng · {fields.length} cột
            </Badge>
          </div>
        }
      />

      {/* View switcher */}
      <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/40 w-fit">
        {(Object.keys(VIEWS) as ViewMode[]).map((m) => {
          const isAvailable = m !== "kanban" || statusField !== null;
          if (!isAvailable) return null;
          const Icon = VIEWS[m].icon;
          const active = view === m;
          return (
            <Link
              key={m}
              href={`/collections/${id}?view=${m}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {VIEWS[m].label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Database}
              title="Chưa có dữ liệu"
              description="Nhắn bot để thêm dòng đầu tiên — vd: 'Thêm vào bảng X một dòng với...'"
            />
          </CardContent>
        </Card>
      ) : view === "kanban" && statusField ? (
        <KanbanView
          rows={rows}
          fields={fields}
          titleField={titleField}
          statusField={statusField}
        />
      ) : view === "table" ? (
        <TableView rows={rows} fields={fields} />
      ) : (
        <CardsView
          rows={rows}
          fields={fields}
          titleField={titleField}
          statusField={statusField}
        />
      )}
    </div>
  );
}
