"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Code2,
  ExternalLink,
  FileArchive,
  FileDown,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CountryFlag } from "@/components/ui/CountryFlag";
import type { ThemeVariant } from "@/lib/themes";
import { getTheme } from "@/lib/themes";

interface FunnelsViewProps {
  locale: string;
  themeVariant: ThemeVariant;
}

interface FunnelRow {
  id: string;
  name: string;
  geo: string | null;
  description: string | null;
  zipFileName: string | null;
  zipSizeBytes: number;
  pdfFileName: string | null;
  hasPdf: boolean;
  entryFile: string | null;
  fileCount: number;
  hasPhp: boolean;
  isQuiz: boolean;
  visibility: "public" | "private";
  createdAt: string;
}

type PanelMode = "preview" | "files" | null;

function formatBytes(n: number): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function FunnelsView({ locale, themeVariant }: FunnelsViewProps) {
  const t = useTranslations("funnelsPage");
  const theme = getTheme(themeVariant);

  const [funnels, setFunnels] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FunnelRow | null>(null);
  const [name, setName] = useState("");
  const [geo, setGeo] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isQuiz, setIsQuiz] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createZip, setCreateZip] = useState<File | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [active, setActive] = useState<FunnelRow | null>(null);
  const [panel, setPanel] = useState<PanelMode>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [assets, setAssets] = useState({
    images: 0,
    styles: 0,
    scripts: 0,
    pages: 0,
    total: 0,
  });
  const [currentPage, setCurrentPage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);
  const [pdfProgress, setPdfProgress] = useState("");
  const [recording, setRecording] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createZipInputRef = useRef<HTMLInputElement>(null);
  const rowUploadRef = useRef<HTMLInputElement>(null);
  const recordCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const [rowUploadId, setRowUploadId] = useState<string | null>(null);

  const openPanel = useCallback(async (f: FunnelRow, mode: PanelMode) => {
    setActive(f);
    setPanel(mode);
    setPdfMsg(null);
    setPdfProgress("");
    const res = await fetch(`/api/funnels/${f.id}/files`);
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files ?? []);
      setPages(data.pages ?? []);
      if (data.assets) setAssets(data.assets);
      const entry = data.funnel?.entryFile || data.pages?.[0] || "";
      setCurrentPage(entry);
      if (data.funnel) {
        setActive((a) => (a && a.id === f.id ? { ...a, ...data.funnel } : a));
      }
    }
  }, []);

  const load = useCallback(
    async (opts?: { openId?: string | null }) => {
      const [funnelsRes, meRes] = await Promise.all([
        fetch("/api/funnels"),
        fetch("/api/auth/login"),
      ]);
      let list: FunnelRow[] = [];
      if (funnelsRes.ok) {
        const data = await funnelsRes.json();
        list = data.funnels ?? [];
        setFunnels(list);
      }
      if (meRes.ok) {
        const me = await meRes.json();
        setIsAdmin(me.user?.role === "admin");
      }
      setLoading(false);

      const openId = opts?.openId;
      if (openId) {
        const f = list.find((x) => x.id === openId);
        if (f) await openPanel(f, "preview");
      }
    },
    [openPanel],
  );

  useEffect(() => {
    let openId: string | null = null;
    try {
      openId = sessionStorage.getItem("fs-open-funnel");
      if (openId) sessionStorage.removeItem("fs-open-funnel");
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => {
      void load({ openId });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function resetForm() {
    setName("");
    setGeo("");
    setDescription("");
    setVisibility("public");
    setIsQuiz(false);
    setCreateZip(null);
    setCreateError(null);
    setDragOver(false);
    if (createZipInputRef.current) createZipInputRef.current.value = "";
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setCreating(true);
  }

  function openEdit(f: FunnelRow) {
    setCreating(false);
    setEditing(f);
    setName(f.name);
    setGeo(f.geo ?? "");
    setDescription(f.description ?? "");
    setVisibility(f.visibility ?? "public");
    setIsQuiz(Boolean(f.isQuiz));
    setCreateZip(null);
    setCreateError(null);
  }

  function closeFormModal() {
    setCreating(false);
    setEditing(null);
    resetForm();
  }

  function pickZipFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setCreateError(t("zipOnly"));
      return;
    }
    setCreateError(null);
    setCreateZip(file);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          geo: geo || null,
          description: description || null,
          visibility,
          isQuiz,
        }),
      });
      if (!res.ok) {
        setCreateError(t("createError"));
        return;
      }
      let funnel = await res.json();

      if (createZip) {
        const fd = new FormData();
        fd.append("file", createZip);
        const up = await fetch(`/api/funnels/${funnel.id}/upload`, {
          method: "POST",
          body: fd,
        });
        if (up.ok) {
          funnel = await up.json();
        } else {
          const err = await up.json().catch(() => ({}));
          setCreateError(err.error || t("uploadError"));
          await load();
          return;
        }
      }

      closeFormModal();
      await load();
      if (funnel?.zipFileName) await openPanel(funnel, "preview");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/funnels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name,
          geo: geo || null,
          description: description || null,
          visibility,
          isQuiz,
        }),
      });
      if (!res.ok) {
        setCreateError(t("createError"));
        return;
      }
      let funnel = await res.json();

      if (createZip) {
        const fd = new FormData();
        fd.append("file", createZip);
        const up = await fetch(`/api/funnels/${editing.id}/upload`, {
          method: "POST",
          body: fd,
        });
        if (up.ok) funnel = await up.json();
        else {
          const err = await up.json().catch(() => ({}));
          setCreateError(err.error || t("uploadError"));
          return;
        }
      }

      closeFormModal();
      await load();
      if (active?.id === funnel.id) setActive(funnel);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/funnels?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (active?.id === id) {
        setActive(null);
        setPanel(null);
      }
      await load();
    }
  }

  async function handleRowUpload(file: File, id: string) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/funnels/${id}/upload`, {
        method: "POST",
        body: fd,
      });
      const raw = await res.text();
      let data: { error?: string; zipFileName?: string; fileCount?: number } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setUploadError(
          `${t("uploadError")} (HTTP ${res.status}: ${raw.slice(0, 120) || "empty"})`,
        );
        return;
      }
      if (res.ok && (data.zipFileName || data.fileCount)) {
        await load();
        const refreshed = await fetch("/api/funnels").then((r) => r.json());
        const row = (refreshed.funnels as FunnelRow[] | undefined)?.find(
          (x) => x.id === id,
        );
        if (row) await openPanel(row, "preview");
      } else {
        setUploadError(data.error || `${t("uploadError")} (HTTP ${res.status})`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setUploadError(msg ? `${t("uploadError")}: ${msg}` : t("uploadError"));
    } finally {
      setUploading(false);
      setRowUploadId(null);
      if (rowUploadRef.current) rowUploadRef.current.value = "";
    }
  }

  async function toggleIsQuiz(next: boolean) {
    if (!active) return;
    if (recording) void stopQuizRecord(false);
    setActive({ ...active, isQuiz: next });
    setFunnels((prev) =>
      prev.map((f) => (f.id === active.id ? { ...f, isQuiz: next } : f)),
    );
    void fetch("/api/funnels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: active.id,
        name: active.name,
        geo: active.geo,
        description: active.description,
        visibility: active.visibility,
        isQuiz: next,
      }),
    }).catch(() => null);
  }

  async function savePdfFromCanvases(
    canvases: HTMLCanvasElement[],
    name: string,
    funnelId: string,
  ) {
    const [{ jsPDF }, { canvasesToPdf }] = await Promise.all([
      import("jspdf"),
      import("@/lib/quiz-pdf"),
    ]);
    const pdf = canvasesToPdf(jsPDF, canvases, name);
    const fileBase = name.replace(/\s+/g, "_");
    try {
      const blob = pdf.output("blob");
      const fd = new FormData();
      fd.append("file", blob, `${fileBase}_preview.pdf`);
      const saveRes = await fetch(`/api/funnels/${funnelId}/pdf`, {
        method: "POST",
        body: fd,
      });
      if (saveRes.ok) {
        const saved = (await saveRes.json()) as { funnel?: FunnelRow };
        if (saved.funnel) {
          setFunnels((prev) =>
            prev.map((f) => (f.id === funnelId ? { ...f, ...saved.funnel! } : f)),
          );
          setActive((a) =>
            a && a.id === funnelId ? { ...a, ...saved.funnel! } : a,
          );
        } else {
          setFunnels((prev) =>
            prev.map((f) =>
              f.id === funnelId
                ? { ...f, hasPdf: true, pdfFileName: `${fileBase}_preview.pdf` }
                : f,
            ),
          );
        }
      }
    } catch {
      /* still download locally */
    }
    pdf.save(`${fileBase}_preview.pdf`);
    setPdfMsg(t("pdfDoneCount", { count: canvases.length }));
    setPdfProgress("");
  }

  /** Landing: one full-page PDF. */
  async function generateLandingPdf() {
    if (!active || !iframeRef.current) return;
    setPdfBusy(true);
    setPdfMsg(t("pdfWorkingLanding"));
    setPdfProgress("");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { captureLanding } = await import("@/lib/quiz-pdf");
      const canvas = await captureLanding(iframeRef.current, html2canvas);
      if (!canvas) {
        setPdfMsg(t("pdfError"));
        return;
      }
      await savePdfFromCanvases([canvas], active.name, active.id);
    } catch {
      setPdfMsg(t("pdfError"));
    } finally {
      setPdfBusy(false);
    }
  }

  async function addRecordFrame() {
    if (!iframeRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const { captureFrame } = await import("@/lib/quiz-pdf");
    const canvas = await captureFrame(iframeRef.current, html2canvas);
    if (!canvas) return;
    recordCanvasesRef.current.push(canvas);
    setPdfProgress(
      t("pdfRecordCount", { count: recordCanvasesRef.current.length }),
    );
  }

  function detachQuizListener() {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.removeEventListener("click", onQuizClickCapture, true);
    }
  }

  const onQuizClickCapture = useCallback(() => {
    window.setTimeout(() => {
      void (async () => {
        await addRecordFrame();
      })();
    }, 800);
  }, []);

  async function startQuizRecord() {
    if (!active || !iframeRef.current) return;
    void toggleIsQuiz(true);
    recordCanvasesRef.current = [];
    setRecording(true);
    setPdfMsg(t("pdfRecordHint"));
    setPdfProgress("");
    await addRecordFrame();
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.removeEventListener("click", onQuizClickCapture, true);
      doc.addEventListener("click", onQuizClickCapture, true);
    }
  }

  async function stopQuizRecord(build: boolean) {
    detachQuizListener();
    setRecording(false);

    if (!build || !active) {
      recordCanvasesRef.current = [];
      setPdfProgress("");
      setPdfMsg(null);
      return;
    }

    const frames = [...recordCanvasesRef.current];
    recordCanvasesRef.current = [];
    if (frames.length === 0) {
      setPdfMsg(t("pdfError"));
      return;
    }
    setPdfBusy(true);
    setPdfMsg(t("pdfWorkingShort"));
    try {
      await savePdfFromCanvases(frames, active.name, active.id);
    } catch {
      setPdfMsg(t("pdfError"));
    } finally {
      setPdfBusy(false);
    }
  }

  useEffect(() => {
    if (!recording) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.addEventListener("click", onQuizClickCapture, true);
    return () => {
      doc.removeEventListener("click", onQuizClickCapture, true);
    };
  }, [recording, currentPage, onQuizClickCapture]);

  async function generatePdf() {
    if (!active) return;
    if (active.isQuiz) {
      await startQuizRecord();
    } else {
      await generateLandingPdf();
    }
  }

  const previewSrc =
    active && currentPage
      ? `/api/funnels/${active.id}/asset/${currentPage
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`
      : "";

  const inputStyle = {
    backgroundColor: theme.bg,
    borderColor: theme.border,
    color: theme.text,
  } as const;

  const formOpen = creating || editing != null;

  function ActionBtn({
    title,
    onClick,
    color,
    children,
    disabled,
  }: {
    title: string;
    onClick: () => void;
    color: string;
    children: ReactNode;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="rounded-lg p-2 transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ color }}
      >
        {children}
      </button>
    );
  }

  return (
    <DashboardShell
      locale={locale}
      themeVariant={themeVariant}
      title={t("title")}
      showFilters={false}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm" style={{ color: theme.textMuted }}>
          {t("subtitle")}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-black"
          style={{ backgroundColor: theme.accent }}
        >
          <Plus size={16} />
          {t("add")}
        </button>
      </div>

      <input
        ref={rowUploadRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && rowUploadId) void handleRowUpload(file, rowUploadId);
        }}
      />

      {loading ? (
        <p className="text-sm" style={{ color: theme.textMuted }}>
          ...
        </p>
      ) : funnels.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"
          style={{ borderColor: theme.border, color: theme.textMuted }}
        >
          <FileArchive size={32} style={{ color: theme.accent }} />
          <p className="text-sm">{t("empty")}</p>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg px-3 py-2 text-sm font-medium text-black"
            style={{ backgroundColor: theme.accent }}
          >
            {t("add")}
          </button>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
        >
          {funnels.map((f, idx) => {
            const selected = selectedId === f.id;
            const ready = Boolean(f.zipFileName);
            return (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(f.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelectedId(f.id);
                }}
                className="flex flex-wrap items-center gap-3 border-b px-4 py-3.5 last:border-b-0 sm:flex-nowrap sm:gap-4"
                style={{
                  borderColor: theme.border,
                  backgroundColor: selected
                    ? `${theme.accent}0d`
                    : idx % 2 === 0
                      ? "transparent"
                      : `${theme.border}33`,
                }}
              >
                <span
                  className="hidden h-4 w-4 shrink-0 rounded-full border sm:block"
                  style={{
                    borderColor: selected ? theme.accent : theme.border,
                    backgroundColor: selected ? theme.accent : "transparent",
                  }}
                />

                <div className="min-w-0 flex-1 basis-45">
                  <div className="truncate font-semibold tracking-tight">
                    {f.name}
                  </div>
                  <div
                    className="truncate text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {f.zipFileName ?? t("noZip")}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{ borderColor: theme.border }}
                >
                  {f.geo ? (
                    <>
                      <CountryFlag
                        code={f.geo}
                        className="h-3.5 w-5 rounded-sm object-cover"
                      />
                      {f.geo}
                    </>
                  ) : (
                    <span style={{ color: theme.textMuted }}>—</span>
                  )}
                </div>

                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: ready
                      ? "rgba(34,197,94,0.15)"
                      : `${theme.textMuted}22`,
                    color: ready ? "#4ade80" : theme.textMuted,
                  }}
                >
                  {ready
                    ? f.visibility === "private"
                      ? t("statusPrivate")
                      : t("statusPublic")
                    : t("statusDraft")}
                </span>

                {f.isQuiz && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: "rgba(56,189,248,0.15)",
                      color: "#38bdf8",
                    }}
                  >
                    {t("typeQuiz")}
                  </span>
                )}

                <span
                  className="hidden w-20 shrink-0 text-right text-xs tabular-nums sm:block"
                  style={{ color: theme.textMuted }}
                >
                  {formatBytes(f.zipSizeBytes)}
                </span>

                <span
                  className="hidden w-24 shrink-0 text-right text-xs tabular-nums md:block"
                  style={{ color: theme.textMuted }}
                >
                  {formatDate(f.createdAt, locale)}
                </span>

                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                  <ActionBtn
                    title={t("preview")}
                    color={theme.accent}
                    disabled={!ready}
                    onClick={() => void openPanel(f, "preview")}
                  >
                    <ExternalLink size={16} />
                  </ActionBtn>
                  <ActionBtn
                    title={t("edit")}
                    color={theme.textMuted}
                    onClick={() => openEdit(f)}
                  >
                    <Pencil size={16} />
                  </ActionBtn>
                  {isAdmin && (
                    <ActionBtn
                      title={t("files")}
                      color={theme.textMuted}
                      disabled={!ready}
                      onClick={() => void openPanel(f, "files")}
                    >
                      <Code2 size={16} />
                    </ActionBtn>
                  )}
                  <ActionBtn
                    title={t("uploadZip")}
                    color={theme.textMuted}
                    disabled={uploading}
                    onClick={() => {
                      setUploadError(null);
                      setRowUploadId(f.id);
                      rowUploadRef.current?.click();
                    }}
                  >
                    <Upload size={16} />
                  </ActionBtn>
                  {f.hasPdf && (
                    <ActionBtn
                      title={t("downloadPdf")}
                      color={theme.textMuted}
                      onClick={() => {
                        window.location.href = `/api/funnels/${f.id}/pdf`;
                      }}
                    >
                      <FileDown size={16} />
                    </ActionBtn>
                  )}
                  <ActionBtn
                    title={t("delete")}
                    color={theme.chartDanger}
                    onClick={() => void handleDelete(f.id)}
                  >
                    <Trash2 size={16} />
                  </ActionBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {uploadError && (
        <p className="mt-3 text-sm text-red-400">{uploadError}</p>
      )}

      {uploading && (
        <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
          {t("uploading")}
        </p>
      )}

      {/* Preview / files panel */}
      {active && panel && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/75 p-2 sm:p-4">
          <div
            className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
              style={{ borderColor: theme.border }}
            >
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{active.name}</div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-[11px]" style={{ color: theme.textMuted }}>
                  <span>{t("assetsSummary", {
                    total: assets.total,
                    images: assets.images,
                    pages: assets.pages,
                  })}</span>
                  {active.hasPhp && <span>· {t("phpPreviewHint")}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {panel === "preview" && (
                  <>
                    <div className="flex overflow-hidden rounded-lg border text-xs font-semibold"
                      style={{ borderColor: theme.border }}
                    >
                      <button
                        type="button"
                        onClick={() => void toggleIsQuiz(false)}
                        className="px-2.5 py-2"
                        style={{
                          backgroundColor: !active.isQuiz
                            ? `${theme.accent}33`
                            : "transparent",
                          color: !active.isQuiz ? theme.accent : theme.textMuted,
                        }}
                      >
                        {t("typeLanding")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleIsQuiz(true)}
                        className="px-2.5 py-2"
                        style={{
                          backgroundColor: active.isQuiz
                            ? "rgba(56,189,248,0.25)"
                            : "transparent",
                          color: active.isQuiz ? "#38bdf8" : theme.textMuted,
                        }}
                      >
                        {t("typeQuiz")}
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleRowUpload(file, active.id);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading || recording}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
                      style={{ borderColor: theme.border }}
                    >
                      <Upload size={14} />
                      {uploading ? "..." : t("uploadZip")}
                    </button>
                    {!recording ? (
                      <button
                        type="button"
                        disabled={pdfBusy || !currentPage}
                        onClick={() => void generatePdf()}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                        style={{
                          backgroundColor: active.isQuiz ? "#38bdf8" : theme.accent,
                        }}
                      >
                        <FileDown size={16} />
                        {pdfBusy
                          ? t("pdfWorkingShort")
                          : active.isQuiz
                            ? t("pdfStartRecord")
                            : t("generatePdf")}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void stopQuizRecord(true)}
                          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black"
                          style={{ backgroundColor: "#4ade80" }}
                        >
                          <FileDown size={16} />
                          {t("pdfFinishRecord")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void stopQuizRecord(false)}
                          className="rounded-lg border px-3 py-2 text-xs"
                          style={{ borderColor: theme.border }}
                        >
                          {t("pdfCancelRecord")}
                        </button>
                      </>
                    )}
                    {active.hasPdf && !recording && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/api/funnels/${active.id}/pdf`;
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
                        style={{ borderColor: theme.border, color: "#38bdf8" }}
                      >
                        <FileDown size={14} />
                        {t("downloadPdf")}
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPanel(null);
                    setActive(null);
                  }}
                  className="rounded-lg p-2"
                  style={{ color: theme.textMuted }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {(pdfMsg || pdfProgress) && (
              <div
                className="border-b px-4 py-2 text-xs"
                style={{ borderColor: theme.border, color: theme.textMuted }}
              >
                {pdfProgress && <span className="mr-3">{pdfProgress}</span>}
                {pdfMsg}
              </div>
            )}

            {panel === "preview" ? (
              <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside
                  className="flex max-h-48 flex-col border-b lg:max-h-none lg:border-r lg:border-b-0"
                  style={{ borderColor: theme.border }}
                >
                  <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: theme.border, color: theme.textMuted }}>
                    {t("pages")}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 text-xs">
                    {pages.length === 0 ? (
                      <p className="p-2" style={{ color: theme.textMuted }}>{t("uploadFirst")}</p>
                    ) : (
                      <ul className="space-y-1">
                        {pages.map((p) => (
                          <li key={p}>
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className="w-full rounded-lg px-2.5 py-2 text-left"
                              style={{
                                backgroundColor:
                                  currentPage === p ? `${theme.accent}22` : "transparent",
                                color: currentPage === p ? theme.accent : theme.text,
                              }}
                            >
                              {p}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="border-t px-3 py-2 text-[10px] leading-relaxed" style={{ borderColor: theme.border, color: theme.textMuted }}>
                    {t("pdfQuizHint")}
                  </div>
                </aside>

                <div className="flex min-h-0 flex-1 flex-col items-center bg-[#0a0a0a] p-3 sm:p-5">
                  <div className="relative w-full max-w-[420px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl">
                    {previewSrc ? (
                      <iframe
                        ref={iframeRef}
                        title={t("preview")}
                        src={previewSrc}
                        className="h-full min-h-[65vh] w-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    ) : (
                      <div className="flex h-[65vh] items-center justify-center text-sm text-neutral-500">
                        {t("uploadFirst")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto p-4">
                <p className="mb-3 text-xs" style={{ color: theme.textMuted }}>
                  {t("assetsSummary", {
                    total: assets.total,
                    images: assets.images,
                    pages: assets.pages,
                  })}
                </p>
                <ul className="space-y-1 font-mono text-xs">
                  {files.map((f) => (
                    <li key={f}>
                      <button
                        type="button"
                        className="rounded px-2 py-1 hover:underline"
                        style={{ color: theme.accent }}
                        onClick={() => {
                          if (/\.(html?|php)$/i.test(f)) {
                            setCurrentPage(f);
                            setPanel("preview");
                          } else {
                            window.open(
                              `/api/funnels/${active.id}/asset/${f
                                .split("/")
                                .map(encodeURIComponent)
                                .join("/")}`,
                              "_blank",
                            );
                          }
                        }}
                      >
                        {f}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={editing ? handleEdit : handleCreate}
            className="w-full max-w-md rounded-xl border p-5"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="font-medium">
                {editing ? t("edit") : t("add")}
              </div>
              <button type="button" onClick={closeFormModal}>
                <X size={18} style={{ color: theme.textMuted }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {t("name")}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                  required
                  maxLength={120}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {t("geo")}
                  </label>
                  <input
                    value={geo}
                    onChange={(e) => setGeo(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="KZ"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    {t("visibility")}
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(e.target.value as "public" | "private")
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  >
                    <option value="public">{t("statusPublic")}</option>
                    <option value="private">{t("statusPrivate")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {t("funnelType")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuiz(false)}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{
                      borderColor: !isQuiz ? theme.accent : theme.border,
                      backgroundColor: !isQuiz ? `${theme.accent}22` : "transparent",
                      color: !isQuiz ? theme.accent : theme.text,
                    }}
                  >
                    {t("typeLanding")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuiz(true)}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{
                      borderColor: isQuiz ? theme.accent : theme.border,
                      backgroundColor: isQuiz ? `${theme.accent}22` : "transparent",
                      color: isQuiz ? theme.accent : theme.text,
                    }}
                  >
                    {t("typeQuiz")}
                  </button>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>
                  {isQuiz ? t("typeQuizHint") : t("typeLandingHint")}
                </p>
              </div>

              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {t("description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                  rows={2}
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {t("zipLabel")}
                </label>
                <input
                  ref={createZipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => pickZipFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => createZipInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickZipFile(e.dataTransfer.files?.[0]);
                  }}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center"
                  style={{
                    borderColor: dragOver ? theme.accent : theme.border,
                    backgroundColor: dragOver
                      ? `${theme.accent}14`
                      : theme.bg,
                    color: theme.textMuted,
                  }}
                >
                  <Upload size={20} style={{ color: theme.accent }} />
                  <span
                    className="text-sm"
                    style={{ color: createZip ? theme.text : undefined }}
                  >
                    {createZip ? createZip.name : t("zipDrop")}
                  </span>
                </button>
              </div>
            </div>

            {createError && (
              <p className="mt-3 text-sm text-red-400">{createError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-black disabled:opacity-60"
              style={{ backgroundColor: theme.accent }}
            >
              {saving
                ? t("creating")
                : editing
                  ? t("saveEdit")
                  : createZip
                    ? t("createWithZip")
                    : t("save")}
            </button>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
