import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useTemplate, useCreateTemplate, useUpdateTemplate } from "@/hooks/use-templates";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Loader2, MousePointer2, Save, Type, UploadCloud,
  Hash, AlignLeft, AlignCenter, AlignRight, Trash2, Eye,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  ZoomIn, ZoomOut, Maximize2, Copy, RotateCcw,
} from "lucide-react";
import { Stage, Layer, Rect, Text as KonvaText, Transformer } from "react-konva";
import useImage from "use-image";
import { v4 as uuidv4 } from "uuid";
import { TemplateField } from "@shared/schema";
import { Image as KonvaImage } from "react-konva";
import { useToast } from "@/hooks/use-toast";

const A4_WIDTH  = 595.28;
const A4_HEIGHT = 841.89;
const ZOOM_MIN  = 0.25;
const ZOOM_MAX  = 2.5;
const ZOOM_STEP = 0.15;

// ─── Field Types ──────────────────────────────────────────────────────────────
export const FIELD_TYPES = [
  { value: "invoice_number",    label: "Invoice Number",          description: "Allows all characters" },
  { value: "invoice_date",      label: "Invoice Date",            description: "Date only" },
  { value: "due_date",          label: "Due Date",                description: "Date only" },
  { value: "client_name",       label: "Client/Customer Name",    description: "Customer name" },
  { value: "client_address",    label: "Client/Customer Address", description: "Customer address" },
  { value: "description",       label: "Description",             description: "Text, numbers, special chars — wraps inside box" },
  { value: "quantity",          label: "Quantity",                description: "Whole numbers only" },
  { value: "unit_price",        label: "Unit Price",              description: "Currency value" },
  { value: "line_total",        label: "Line Total",              description: "Auto: Qty x Unit Price" },
  { value: "subtotal",          label: "Subtotal",                description: "Auto: sum of line totals" },
  { value: "discount",          label: "Discount",                description: "Flat amount deducted" },
  { value: "tax",               label: "Tax (%)",                 description: "Percentage of subtotal" },
  { value: "grand_total",       label: "Grand Total",             description: "Auto: final total" },
  { value: "amount_paid",       label: "Amount Paid",             description: "Advance payment deducted" },
  { value: "remaining_balance", label: "Remaining Balance",       description: "Auto: Grand Total - Paid" },
] as const;

export type FieldTypeValue = typeof FIELD_TYPES[number]["value"];

export const AUTO_COMPUTED_FIELDS: FieldTypeValue[] = [
  "line_total", "subtotal", "grand_total", "remaining_balance",
];

// ─── Font Options ─────────────────────────────────────────────────────────────
export const FONT_OPTIONS = [
  { value: "Helvetica",       label: "Helvetica"       },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New",     label: "Courier New"     },
  { value: "Georgia",         label: "Georgia"         },
  { value: "Arial",           label: "Arial"           },
  { value: "Verdana",         label: "Verdana"         },
  { value: "Trebuchet MS",    label: "Trebuchet MS"    },
  { value: "Impact",          label: "Impact"          },
] as const;

export type FontValue = typeof FONT_OPTIONS[number]["value"];

// ─── PDF helpers ──────────────────────────────────────────────────────────────
export function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full  = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean.padEnd(6, "0");
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

export function toPdfLibFontName(fontFamily: string): string {
  const map: Record<string, string> = {
    "Helvetica":       "Helvetica",
    "Times New Roman": "TimesRoman",
    "Courier New":     "Courier",
    "Georgia":         "TimesRoman",
    "Arial":           "Helvetica",
    "Verdana":         "Helvetica",
    "Trebuchet MS":    "Helvetica",
    "Impact":          "HelveticaBold",
  };
  return map[fontFamily] ?? "Helvetica";
}

export function wrapText(
  text: string,
  font: { widthOfTextAtSize(t: string, s: number): number },
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

// ─── Background image ─────────────────────────────────────────────────────────
const BackgroundImage = ({ url }: { url: string }) => {
  const [image] = useImage(url, "anonymous");
  if (!image) return null;
  const scale = A4_WIDTH / image.width;
  return (
    <Layer>
      <KonvaImage image={image} x={0} y={0} width={A4_WIDTH} height={image.height * scale} />
    </Layer>
  );
};

const SWATCHES = [
  "#1a1a1a", "#374151", "#6B7280", "#000000",
  "#1e40af", "#0f766e", "#15803d", "#b91c1c",
  "#9333ea", "#c2410c", "#d97706", "#0369a1",
];

type ExtField = TemplateField & {
  fontFamily?:        string;
  color?:             string;
  verticalAlignment?: "top" | "middle" | "bottom";
};

// ─── Tiny icon button ─────────────────────────────────────────────────────────
function IconBtn({
  onClick, title, disabled, children, variant = "default",
}: {
  onClick: () => void; title: string; disabled?: boolean;
  children: React.ReactNode; variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
        ${variant === "danger"
          ? "text-slate-500 hover:bg-red-50 hover:text-destructive"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`}
    >
      {children}
    </button>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{label}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600 font-medium">{label}</Label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TemplateEditor() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;

  const { data: existingTemplate, isLoading: loadingTemplate } = useTemplate(id || "");
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const { toast }      = useToast();

  const [name,       setName]       = useState("New Template");
  const [fileURL,    setFileURL]    = useState("");
  const [fields,     setFields]     = useState<ExtField[]>([]);
  const [selectedId, selectShape]   = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [zoom,       setZoom]       = useState(0.85);

  const stageRef     = useRef<any>(null);
  const trRef        = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Load template ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setFileURL(existingTemplate.fileURL);
      setFields((existingTemplate.fields || []) as ExtField[]);
    }
  }, [existingTemplate]);

  // ── Fit zoom to viewport ────────────────────────────────────────────────────
  const fitToContainer = useCallback(() => {
    if (containerRef.current) {
      const pad = 80;
      const w   = containerRef.current.clientWidth  - pad;
      const h   = containerRef.current.clientHeight - pad;
      const fit = Math.min(w / A4_WIDTH, h / A4_HEIGHT, 1.5);
      setZoom(parseFloat(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fit)).toFixed(2)));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", fitToContainer);
    fitToContainer();
    setTimeout(fitToContainer, 100);
    return () => window.removeEventListener("resize", fitToContainer);
  }, [fitToContainer, fileURL]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "=") {
        e.preventDefault();
        setZoom(z => parseFloat(Math.min(ZOOM_MAX, z + ZOOM_STEP).toFixed(2)));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        setZoom(z => parseFloat(Math.max(ZOOM_MIN, z - ZOOM_STEP).toFixed(2)));
      }
      if (e.key === "Escape") selectShape(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setFields(prev => prev.filter(f => f.id !== selectedId));
        selectShape(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // ── Sync transformer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedId && trRef.current && stageRef.current) {
      const node = stageRef.current.findOne("#" + selectedId);
      if (node) { trRef.current.nodes([node]); trRef.current.getLayer().batchDraw(); }
    }
  }, [selectedId, fields]);

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const imageUrl = file.type === "application/pdf"
        ? url.replace("/upload/", "/upload/pg_1,f_jpg/")
        : url;
      setFileURL(imageUrl);
      if (isNew) setName(file.name.split(".")[0]);
      setTimeout(fitToContainer, 200);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Add field ───────────────────────────────────────────────────────────────
  const addField = () => {
    const f: ExtField = {
      id: uuidv4(), name: `Field_${fields.length + 1}`,
      type: "description",
      x: 100, y: 100, width: 180, height: 30,
      fontSize: 12, alignment: "left", page: 1,
      fontFamily: "Helvetica", color: "#1a1a1a", verticalAlignment: "top",
    };
    setFields(prev => [...prev, f]);
    selectShape(f.id);
  };

  // ── Duplicate field ─────────────────────────────────────────────────────────
  const duplicateField = (fieldId: string) => {
    const src = fields.find(f => f.id === fieldId);
    if (!src) return;
    const copy: ExtField = { ...src, id: uuidv4(), name: `${src.name}_copy`, x: src.x + 16, y: src.y + 16 };
    setFields(prev => [...prev, copy]);
    selectShape(copy.id);
    toast({ title: "Field duplicated", description: "Box copied with identical dimensions." });
  };

  const updateSelected = (changes: Partial<ExtField>) => {
    if (!selectedId) return;
    setFields(prev => prev.map(f => f.id === selectedId ? { ...f, ...changes } : f));
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!fileURL) { toast({ title: "Please upload a template background", variant: "destructive" }); return; }
    if (!name)    { toast({ title: "Please name your template",           variant: "destructive" }); return; }
    const payload = { name, fileURL, fields };
    if (isNew) {
      createMutation.mutate(payload, { onSuccess: () => { toast({ title: "Template saved!" }); setLocation("/templates"); } });
    } else {
      updateMutation.mutate({ id, ...payload }, { onSuccess: () => { toast({ title: "Template updated!" }); setLocation("/templates"); } });
    }
  };

  const checkDeselect = (e: any) => {
    if (e.target === e.target.getStage() || e.target.name() === "bg") selectShape(null);
  };

  if (!isNew && loadingTemplate) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-8 h-8 text-primary" />
          <p className="text-sm text-slate-500 font-medium">Loading template…</p>
        </div>
      </div>
    );
  }

  const selectedField = fields.find(f => f.id === selectedId);
  const isSaving      = createMutation.isPending || updateMutation.isPending;
  const getFieldLabel = (type: string) => FIELD_TYPES.find(ft => ft.value === type)?.label ?? type;
  const zoomPct       = Math.round(zoom * 100);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#eef0f3] z-50">

      {/* ── Topbar ───────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
        {/* Left: back + name */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost" size="icon"
            onClick={() => setLocation("/templates")}
            className="text-slate-500 rounded-xl hover:bg-slate-100 h-9 w-9 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="font-semibold text-slate-800 border-transparent hover:border-slate-200 focus:border-primary h-9 w-52 shadow-none bg-transparent text-sm px-2"
            placeholder="Template Name"
          />
        </div>

        {/* Centre: zoom controls */}
        {fileURL && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1.5 select-none">
            <IconBtn onClick={() => setZoom(z => parseFloat(Math.max(ZOOM_MIN, z - ZOOM_STEP).toFixed(2)))} title="Zoom out (Ctrl -)" disabled={zoom <= ZOOM_MIN}>
              <ZoomOut className="w-4 h-4" />
            </IconBtn>
            <button
              onClick={fitToContainer}
              title="Click to fit screen"
              className="min-w-[52px] text-xs font-bold text-slate-600 hover:text-primary transition-colors text-center px-1"
            >
              {zoomPct}%
            </button>
            <IconBtn onClick={() => setZoom(z => parseFloat(Math.min(ZOOM_MAX, z + ZOOM_STEP).toFixed(2)))} title="Zoom in (Ctrl +)" disabled={zoom >= ZOOM_MAX}>
              <ZoomIn className="w-4 h-4" />
            </IconBtn>
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            <IconBtn onClick={fitToContainer} title="Fit to screen">
              <Maximize2 className="w-3.5 h-3.5" />
            </IconBtn>
          </div>
        )}

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLocation("/templates")} className="rounded-xl h-9 text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || uploading}
            className="rounded-xl h-9 text-sm shadow-md shadow-primary/20 hover:-translate-y-px transition-all"
          >
            {isSaving
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
              : <><Save  className="w-3.5 h-3.5 mr-1.5" />Save Template</>
            }
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left toolbar ─────────────────────────────────────────────────── */}
        <aside className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-2 z-10 shrink-0">
          <IconBtn onClick={addField} title="Add field">
            <Type className="w-5 h-5" />
          </IconBtn>
          <div className="relative">
            <IconBtn onClick={() => {}} title="Upload template">
              <UploadCloud className="w-5 h-5" />
              <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
            </IconBtn>
          </div>
          <div className="w-6 h-px bg-slate-200 my-1" />
          <IconBtn onClick={() => selectedId && duplicateField(selectedId)} title="Duplicate selected field" disabled={!selectedId}>
            <Copy className="w-4 h-4" />
          </IconBtn>
          <IconBtn
            onClick={() => { if (!selectedId) return; setFields(prev => prev.filter(f => f.id !== selectedId)); selectShape(null); }}
            title="Delete selected field (Del)"
            disabled={!selectedId}
            variant="danger"
          >
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        </aside>

        {/* ── Canvas ───────────────────────────────────────────────────────── */}
        <main
          ref={containerRef}
          className="flex-1 overflow-auto relative"
          style={{
            background: "#e2e5e9",
            backgroundImage: "radial-gradient(circle, #c5c8cc 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* Upload prompt */}
          {!fileURL && !uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <label className="cursor-pointer group block">
                  <div className="w-28 h-28 bg-white rounded-3xl shadow-lg flex flex-col items-center justify-center mx-auto mb-5 border-2 border-dashed border-slate-300 group-hover:border-primary group-hover:shadow-xl group-hover:shadow-primary/10 transition-all duration-300">
                    <UploadCloud className="w-9 h-9 text-slate-400 group-hover:text-primary transition-colors mb-1" />
                    <span className="text-[10px] text-slate-400 group-hover:text-primary font-semibold uppercase tracking-wide transition-colors">Upload</span>
                  </div>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                </label>
                <h2 className="text-lg font-semibold text-slate-700">Upload Template Background</h2>
                <p className="text-slate-400 mt-1.5 max-w-xs mx-auto text-sm leading-relaxed">
                  Upload a PDF or image, then draw boxes over your invoice layout.
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
                  {["PNG / JPG", "PDF", "Max 10MB"].map(t => (
                    <span key={t} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Uploading spinner */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-primary animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-slate-700">Uploading…</p>
                  <p className="text-xs text-slate-400 mt-0.5">Please wait</p>
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          {fileURL && (
            <div
              className="py-10 flex justify-center"
              style={{ minHeight: A4_HEIGHT * zoom + 80 }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  width: A4_WIDTH,
                  height: A4_HEIGHT,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {/* Paper */}
                <div
                  style={{
                    width: A4_WIDTH, height: A4_HEIGHT,
                    boxShadow: "0 4px 8px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
                    borderRadius: 2,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Stage
                    width={A4_WIDTH} height={A4_HEIGHT}
                    onMouseDown={checkDeselect} onTouchStart={checkDeselect}
                    ref={stageRef}
                  >
                    <BackgroundImage url={fileURL} />
                    <Layer>
                      {fields.map(field => {
                        const isSelected = field.id === selectedId;
                        const fieldColor = field.color      ?? "#1a1a1a";
                        const fieldFont  = field.fontFamily ?? "Helvetica";
                        const hAlign     = field.alignment  ?? "left";
                        const vAlign     = (field.verticalAlignment ?? "top") as "top" | "middle" | "bottom";
                        const label      = getFieldLabel(field.type);
                        const isDesc     = field.type === "description";

                        return [
                          <Rect
                            key={`rect-${field.id}`}
                            id={field.id}
                            x={field.x} y={field.y}
                            width={field.width} height={field.height}
                            fill={isSelected ? "rgba(79,70,229,0.12)" : "rgba(79,70,229,0.05)"}
                            stroke={isSelected ? "#4f46e5" : "#a5b4fc"}
                            strokeWidth={isSelected ? 1.5 : 1}
                            cornerRadius={2}
                            draggable
                            onClick={() => selectShape(field.id)}
                            onTap={() => selectShape(field.id)}
                            onDragEnd={e => setFields(prev => prev.map(pf =>
                              pf.id === field.id ? { ...pf, x: e.target.x(), y: e.target.y() } : pf
                            ))}
                            onTransformEnd={e => {
                              const node = e.target;
                              const sx = node.scaleX(), sy = node.scaleY();
                              node.scaleX(1); node.scaleY(1);
                              setFields(prev => prev.map(pf =>
                                pf.id === field.id ? {
                                  ...pf,
                                  x: node.x(), y: node.y(),
                                  width:  Math.max(5, node.width()  * sx),
                                  height: Math.max(5, node.height() * sy),
                                } : pf
                              ));
                            }}
                          />,
                          <KonvaText
                            key={`text-${field.id}`}
                            x={field.x} y={field.y}
                            width={field.width} height={field.height}
                            text={label}
                            fontSize={Math.min(field.fontSize, field.height - 4)}
                            fontFamily={fieldFont}
                            fill={fieldColor}
                            align={hAlign}
                            verticalAlign={vAlign}
                            padding={4}
                            listening={false}
                            wrap={isDesc ? "word" : "none"}
                            ellipsis={!isDesc}
                          />,
                        ];
                      })}

                      {selectedId && (
                        <Transformer
                          ref={trRef}
                          boundBoxFunc={(o, n) => (n.width < 10 || n.height < 10 ? o : n)}
                          borderStroke="#4f46e5"
                          anchorStroke="#4f46e5"
                          anchorFill="white"
                          anchorSize={8}
                          anchorCornerRadius={2}
                          borderDash={[4, 2]}
                        />
                      )}
                    </Layer>
                  </Stage>

                  {/* Floating copy button next to selected field */}
                  {selectedField && (
                    <button
                      onClick={() => duplicateField(selectedField.id)}
                      title="Duplicate field"
                      style={{
                        position: "absolute",
                        left: Math.min(selectedField.x + selectedField.width + 6, A4_WIDTH - 72),
                        top:  Math.max(selectedField.y - 1, 0),
                        zIndex: 10,
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-md shadow-lg hover:bg-indigo-700 transition-all duration-150 active:scale-95 whitespace-nowrap"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Floating zoom slider — bottom right of canvas */}
          {fileURL && (
            <div className="fixed bottom-5 right-[332px] flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg px-3 py-2 z-20 select-none">
              <IconBtn onClick={() => setZoom(z => parseFloat(Math.max(ZOOM_MIN, z - ZOOM_STEP).toFixed(2)))} title="Zoom out" disabled={zoom <= ZOOM_MIN}>
                <ZoomOut className="w-3.5 h-3.5" />
              </IconBtn>
              <input
                type="range"
                min={Math.round(ZOOM_MIN * 100)}
                max={Math.round(ZOOM_MAX * 100)}
                value={zoomPct}
                onChange={e => setZoom(parseFloat((Number(e.target.value) / 100).toFixed(2)))}
                className="w-24 h-1.5 accent-primary cursor-pointer"
              />
              <IconBtn onClick={() => setZoom(z => parseFloat(Math.min(ZOOM_MAX, z + ZOOM_STEP).toFixed(2)))} title="Zoom in" disabled={zoom >= ZOOM_MAX}>
                <ZoomIn className="w-3.5 h-3.5" />
              </IconBtn>
              <span className="text-[11px] font-bold text-slate-500 w-9 text-right tabular-nums">{zoomPct}%</span>
              <div className="w-px h-3 bg-slate-200" />
              <IconBtn onClick={fitToContainer} title="Reset zoom">
                <RotateCcw className="w-3 h-3" />
              </IconBtn>
            </div>
          )}
        </main>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col z-10 shrink-0">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Properties</h3>
            {selectedId && (
              <span className="text-[10px] text-primary bg-indigo-50 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                Field selected
              </span>
            )}
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <MousePointer2 className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No field selected</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[180px]">
                  Click a field on the canvas to edit its properties
                </p>
              </div>
            ) : selectedField ? (
              <div className="space-y-5">

                <Section label="Field Identification">
                  <Field label="Display Label">
                    <Input
                      value={selectedField.name}
                      onChange={e => updateSelected({ name: e.target.value })}
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm h-9"
                      placeholder="Custom label (optional)"
                    />
                  </Field>
                  <Field label="Field Type">
                    <Select
                      value={selectedField.type}
                      onValueChange={val => {
                        const ftLabel = FIELD_TYPES.find(ft => ft.value === val)?.label ?? val;
                        updateSelected({ type: val, name: ftLabel } as any);
                      }}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-sm h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl max-h-80">
                        {FIELD_TYPES.map(ft => (
                          <SelectItem key={ft.value} value={ft.value}>
                            <span className="font-medium">{ft.label}</span>
                            <span className="ml-2 text-xs text-slate-400">— {ft.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {AUTO_COMPUTED_FIELDS.includes(selectedField.type as FieldTypeValue) && (
                      <p className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                        ✦ Auto-calculated — no manual input required
                      </p>
                    )}
                    {selectedField.type === "description" && (
                      <p className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                        ✎ Text wraps inside the box
                      </p>
                    )}
                  </Field>
                </Section>

                <Section label="Typography & Layout">
                  <Field label="Font Family">
                    <Select
                      value={selectedField.fontFamily ?? "Helvetica"}
                      onValueChange={val => updateSelected({ fontFamily: val })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-sm h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {FONT_OPTIONS.map(fo => (
                          <SelectItem key={fo.value} value={fo.value}>
                            <span style={{ fontFamily: fo.value, fontSize: "13px" }}>{fo.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Font Size (pt)">
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        type="number"
                        value={selectedField.fontSize}
                        onChange={e => updateSelected({ fontSize: Number(e.target.value) })}
                        className="bg-slate-50 border-slate-200 pl-8 rounded-xl text-sm h-9"
                      />
                    </div>
                  </Field>

                  <Field label="Text Color">
                    <div className="flex items-center gap-2">
                      <label className="relative cursor-pointer flex-shrink-0">
                        <div
                          className="w-9 h-9 rounded-xl border-[1.5px] border-slate-200 shadow-inner transition-transform hover:scale-105 active:scale-95"
                          style={{ backgroundColor: selectedField.color ?? "#1a1a1a" }}
                        />
                        <input
                          type="color"
                          value={selectedField.color ?? "#1a1a1a"}
                          onChange={e => updateSelected({ color: e.target.value })}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </label>
                      <Input
                        value={selectedField.color ?? "#1a1a1a"}
                        onChange={e => {
                          if (/^#([0-9A-Fa-f]{0,6})$/.test(e.target.value))
                            updateSelected({ color: e.target.value });
                        }}
                        className="bg-slate-50 border-slate-200 rounded-xl font-mono text-sm h-9"
                        placeholder="#1a1a1a" maxLength={7}
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {SWATCHES.map(hex => (
                        <button
                          key={hex} title={hex} type="button"
                          onClick={() => updateSelected({ color: hex })}
                          className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${(selectedField.color ?? "#1a1a1a") === hex ? "border-primary ring-2 ring-primary/30 scale-110" : "border-slate-200 hover:border-slate-400"}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </Field>

                  <Field label="Horizontal Alignment">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      {(["left", "center", "right"] as const).map(align => (
                        <button key={align} type="button"
                          className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all duration-150 ${(selectedField.alignment ?? "left") === align ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-700"}`}
                          onClick={() => updateSelected({ alignment: align })}
                        >
                          {align === "left"   ? <AlignLeft   className="w-4 h-4" />
                         : align === "center" ? <AlignCenter className="w-4 h-4" />
                         :                      <AlignRight  className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Vertical Alignment">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      {([
                        { value: "top",    Icon: AlignStartVertical,  title: "Top"    },
                        { value: "middle", Icon: AlignCenterVertical, title: "Middle" },
                        { value: "bottom", Icon: AlignEndVertical,    title: "Bottom" },
                      ] as const).map(({ value, Icon, title }) => (
                        <button key={value} type="button" title={title}
                          className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all duration-150 ${(selectedField.verticalAlignment ?? "top") === value ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-700"}`}
                          onClick={() => updateSelected({ verticalAlignment: value })}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </Field>
                </Section>

                <Section label="Live Preview" icon={<Eye className="w-3.5 h-3.5" />}>
                  <div
                    className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden min-h-[56px] flex"
                    style={{
                      alignItems:
                        (selectedField.verticalAlignment ?? "top") === "top"    ? "flex-start" :
                        (selectedField.verticalAlignment ?? "top") === "bottom" ? "flex-end"   : "center",
                    }}
                  >
                    <p
                      style={{
                        fontFamily:   selectedField.fontFamily ?? "Helvetica",
                        fontSize:     `${Math.min(selectedField.fontSize, 22)}px`,
                        color:        selectedField.color ?? "#1a1a1a",
                        textAlign:    (selectedField.alignment ?? "left") as any,
                        width:        "100%",
                        lineHeight:   1.5,
                        wordBreak:    "break-word",
                        padding:      "10px 12px",
                        whiteSpace:   selectedField.type === "description" ? "pre-wrap" : "nowrap",
                        overflow:     selectedField.type === "description" ? "visible"  : "hidden",
                        textOverflow: selectedField.type === "description" ? "unset"    : "ellipsis",
                      }}
                    >
                      {selectedField.type === "description"
                        ? "Sample description text long enough to demonstrate wrapping"
                        : getFieldLabel(selectedField.type)}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    <span style={{ fontFamily: selectedField.fontFamily }}>{selectedField.fontFamily ?? "Helvetica"}</span>
                    {" · "}{selectedField.fontSize}pt
                    {" · "}{selectedField.alignment ?? "left"} / {selectedField.verticalAlignment ?? "top"}
                    {" · "}<span style={{ color: selectedField.color ?? "#1a1a1a" }}>■</span> {selectedField.color ?? "#1a1a1a"}
                  </p>
                </Section>

                <Section label="Position">
                  <div className="grid grid-cols-2 gap-2">
                    {(["X", "Y", "Width", "Height"] as const).map((lbl, i) => {
                      const key = ["x", "y", "width", "height"][i];
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs text-slate-400">{lbl}</Label>
                          <Input
                            type="number"
                            value={Math.round((selectedField as any)[key])}
                            readOnly
                            className="bg-slate-50 text-slate-500 text-sm h-9 rounded-xl"
                          />
                        </div>
                      );
                    })}
                  </div>
                </Section>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-slate-600 hover:bg-indigo-50 hover:text-primary border-slate-200 rounded-xl h-9 text-sm"
                    onClick={() => duplicateField(selectedId!)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-red-50 border-destructive/20 rounded-xl h-9 text-sm"
                    onClick={() => { setFields(fields.filter(f => f.id !== selectedId)); selectShape(null); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Field list */}
          {fields.length > 0 && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
                Fields ({fields.length})
              </p>
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {fields.map(f => (
                  <button
                    key={f.id}
                    onClick={() => selectShape(f.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-between gap-2 ${selectedId === f.id ? "bg-indigo-100 text-primary font-semibold" : "hover:bg-slate-100 text-slate-600"}`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color ?? "#1a1a1a" }} />
                      {f.name}
                    </span>
                    <span className="text-slate-400 text-[10px] flex-shrink-0">
                      {FIELD_TYPES.find(ft => ft.value === f.type)?.label ?? f.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}