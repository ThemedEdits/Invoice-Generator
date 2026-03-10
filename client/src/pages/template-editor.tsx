import { useState, useRef, useEffect, useCallback, memo } from "react";
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
  ZoomIn, ZoomOut, Maximize2, Copy, RotateCcw, Settings2, X,
} from "lucide-react";
import { Stage, Layer, Rect, Text as KonvaText } from "react-konva";
import useImage from "use-image";
import { v4 as uuidv4 } from "uuid";
import { TemplateField } from "@shared/schema";
import { Image as KonvaImage } from "react-konva";
import { useToast } from "@/hooks/use-toast";

const A4_WIDTH         = 595.28;
const A4_HEIGHT        = 841.89;
const ZOOM_MIN         = 0.25;
const ZOOM_MAX         = 2.5;
const ZOOM_STEP        = 0.15;
const PAD              = 48;
const AUTOSCROLL_ZONE  = 60;
const AUTOSCROLL_SPEED = 6;

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

export function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full  = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean.padEnd(6, "0");
  return [parseInt(full.slice(0,2),16)/255, parseInt(full.slice(2,4),16)/255, parseInt(full.slice(4,6),16)/255];
}

export function toPdfLibFontName(fontFamily: string): string {
  const map: Record<string, string> = {
    "Helvetica": "Helvetica", "Times New Roman": "TimesRoman",
    "Courier New": "Courier", "Georgia": "TimesRoman",
    "Arial": "Helvetica", "Verdana": "Helvetica",
    "Trebuchet MS": "Helvetica", "Impact": "HelveticaBold",
  };
  return map[fontFamily] ?? "Helvetica";
}

export function wrapText(
  text: string, font: { widthOfTextAtSize(t: string, s: number): number },
  fontSize: number, maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) { current = candidate; }
      else { if (current) lines.push(current); current = word; }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

// ── Background image ──────────────────────────────────────────────────────────
const BackgroundImage = ({ url }: { url: string }) => {
  const [image] = useImage(url, "anonymous");
  if (!image) return null;
  const scale = A4_WIDTH / image.width;
  return <Layer><KonvaImage image={image} x={0} y={0} width={A4_WIDTH} height={image.height * scale} /></Layer>;
};

const SWATCHES = [
  "#1a1a1a","#374151","#6B7280","#000000",
  "#1e40af","#0f766e","#15803d","#b91c1c",
  "#9333ea","#c2410c","#d97706","#0369a1",
];

type ExtField = TemplateField & {
  fontFamily?:        string;
  color?:             string;
  verticalAlignment?: "top" | "middle" | "bottom";
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-500">{icon}</span>}
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500 font-medium">{label}</Label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PropertiesPanel — defined at MODULE level (never inside a render function)
//  so React never unmounts/remounts it on re-render, preserving input focus.
//
//  All callbacks (updateSelected, duplicateField, deleteSelected) are passed
//  as stable refs via the `actionsRef` pattern below so memo() works correctly
//  even when `fields` state changes on every keystroke.
// ─────────────────────────────────────────────────────────────────────────────
interface PanelActions {
  updateSelected: (changes: Partial<ExtField>) => void;
  duplicateField: (id: string) => void;
  deleteSelected: () => void;
}
interface PropertiesPanelProps {
  selectedId:    string | null;
  selectedField: ExtField | undefined;
  actionsRef:    React.RefObject<PanelActions>;
}

const PropertiesPanel = memo(({ selectedId, selectedField, actionsRef }: PropertiesPanelProps) => {
  const getLabel = (type: string) => FIELD_TYPES.find(ft => ft.value === type)?.label ?? type;
  // Read callbacks through the stable ref — never stale, never causes re-render
  const act = () => actionsRef.current!;

  if (!selectedId) return (
    <div className="p-4 flex flex-col items-center justify-center py-16 text-center flex-1">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <MousePointer2 className="w-6 h-6 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-400">No field selected</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-[180px]">
        Click a field on the canvas to edit its properties
      </p>
    </div>
  );

  if (!selectedField) return null;

  return (
    <div className="p-4 overflow-y-auto flex-1 space-y-5">
      <Section label="Field Identification">
        <FieldRow label="Display Label">
          <Input
            value={selectedField.name}
            onChange={e => act().updateSelected({ name: e.target.value })}
            className="bg-white/[0.04] border-white/[0.08] rounded-xl text-sm h-9"
            placeholder="Custom label (optional)"
          />
        </FieldRow>
        <FieldRow label="Field Type">
          <Select
            value={selectedField.type}
            onValueChange={val => {
              const ftLabel = FIELD_TYPES.find(ft => ft.value === val)?.label ?? val;
              act().updateSelected({ type: val, name: ftLabel } as any);
            }}
          >
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] rounded-xl text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-80">
              {FIELD_TYPES.map(ft => (
                <SelectItem key={ft.value} value={ft.value}>
                  <span className="font-medium">{ft.label}</span>
                  <span className="ml-2 text-xs text-slate-500 hidden sm:inline">— {ft.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {AUTO_COMPUTED_FIELDS.includes(selectedField.type as FieldTypeValue) && (
            <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1.5 rounded-lg">
              ✦ Auto-calculated — no manual input required
            </p>
          )}
          {selectedField.type === "description" && (
            <p className="text-xs text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1.5 rounded-lg">
              ✎ Text wraps inside the box
            </p>
          )}
        </FieldRow>
      </Section>

      <Section label="Typography & Layout">
        <FieldRow label="Font Family">
          <Select value={selectedField.fontFamily ?? "Helvetica"} onValueChange={val => act().updateSelected({ fontFamily: val })}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] rounded-xl text-sm h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {FONT_OPTIONS.map(fo => (
                <SelectItem key={fo.value} value={fo.value}>
                  <span style={{ fontFamily: fo.value, fontSize: "13px" }}>{fo.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Font Size (pt)">
          <div className="relative">
            <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input type="number" value={selectedField.fontSize}
              onChange={e => act().updateSelected({ fontSize: Number(e.target.value) })}
              className="bg-white/[0.04] border-white/[0.08] pl-8 rounded-xl text-sm h-9"
            />
          </div>
        </FieldRow>

        <FieldRow label="Text Color">
          <div className="flex items-center gap-2">
            <label className="relative cursor-pointer flex-shrink-0">
              <div className="w-9 h-9 rounded-xl border-[1.5px] border-white/[0.08] transition-transform hover:scale-105"
                style={{ backgroundColor: selectedField.color ?? "#1a1a1a" }} />
              <input type="color" value={selectedField.color ?? "#1a1a1a"}
                onChange={e => act().updateSelected({ color: e.target.value })}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
            </label>
            <Input value={selectedField.color ?? "#1a1a1a"}
              onChange={e => { if (/^#([0-9A-Fa-f]{0,6})$/.test(e.target.value)) act().updateSelected({ color: e.target.value }); }}
              className="bg-white/[0.04] border-white/[0.08] rounded-xl font-mono text-sm h-9"
              placeholder="#1a1a1a" maxLength={7} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {SWATCHES.map(hex => (
              <button key={hex} title={hex} type="button" onClick={() => act().updateSelected({ color: hex })}
                className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                  (selectedField.color ?? "#1a1a1a") === hex
                    ? "border-amber-400 ring-2 ring-amber-400/30 scale-110"
                    : "border-white/[0.08] hover:border-white/[0.20]"
                }`}
                style={{ backgroundColor: hex }} />
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Horizontal Alignment">
          <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl">
            {(["left","center","right"] as const).map(align => (
              <button key={align} type="button"
                className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all duration-150 ${
                  (selectedField.alignment ?? "left") === align ? "bg-amber-400/15 text-amber-400" : "text-slate-500 hover:text-slate-300"
                }`}
                onClick={() => act().updateSelected({ alignment: align })}>
                {align==="left" ? <AlignLeft className="w-4 h-4" /> : align==="center" ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Vertical Alignment">
          <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl">
            {([
              { value:"top",    Icon: AlignStartVertical,  title:"Top"    },
              { value:"middle", Icon: AlignCenterVertical, title:"Middle" },
              { value:"bottom", Icon: AlignEndVertical,    title:"Bottom" },
            ] as const).map(({ value, Icon, title }) => (
              <button key={value} type="button" title={title}
                className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all duration-150 ${
                  (selectedField.verticalAlignment ?? "top") === value ? "bg-amber-400/15 text-amber-400" : "text-slate-500 hover:text-slate-300"
                }`}
                onClick={() => act().updateSelected({ verticalAlignment: value })}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </FieldRow>
      </Section>

      <Section label="Live Preview" icon={<Eye className="w-3.5 h-3.5" />}>
        <div className="bg-white border border-white/[0.08] rounded-xl overflow-hidden min-h-[56px] flex"
          style={{ alignItems: (selectedField.verticalAlignment ?? "top") === "top" ? "flex-start" : (selectedField.verticalAlignment ?? "top") === "bottom" ? "flex-end" : "center" }}>
          <p style={{
            fontFamily: selectedField.fontFamily ?? "Helvetica",
            fontSize: `${Math.min(selectedField.fontSize, 22)}px`,
            color: selectedField.color ?? "#1a1a1a",
            textAlign: (selectedField.alignment ?? "left") as any,
            width: "100%", lineHeight: 1.5, wordBreak: "break-word", padding: "10px 12px",
            whiteSpace: selectedField.type === "description" ? "pre-wrap" : "nowrap",
            overflow: selectedField.type === "description" ? "visible" : "hidden",
            textOverflow: selectedField.type === "description" ? "unset" : "ellipsis",
          }}>
            {selectedField.type === "description" ? "Sample description text long enough to demonstrate wrapping" : getLabel(selectedField.type)}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span style={{ fontFamily: selectedField.fontFamily }}>{selectedField.fontFamily ?? "Helvetica"}</span>
          {" · "}{selectedField.fontSize}pt{" · "}{selectedField.alignment ?? "left"} / {selectedField.verticalAlignment ?? "top"}
          {" · "}<span style={{ color: selectedField.color ?? "#1a1a1a" }}>■</span> {selectedField.color ?? "#1a1a1a"}
        </p>
      </Section>

      <Section label="Position">
        <div className="grid grid-cols-2 gap-2">
          {(["X","Y","Width","Height"] as const).map((lbl, i) => {
            const key = ["x","y","width","height"][i];
            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-slate-500">{lbl}</Label>
                <Input type="number" value={Math.round((selectedField as any)[key])} readOnly
                  className="bg-white/[0.04] border-white/[0.08] text-slate-500 text-sm h-9 rounded-xl" />
              </div>
            );
          })}
        </div>
      </Section>

      <div className="pt-2 border-t border-white/[0.08] flex gap-2">
        <Button variant="outline" className="flex-1 rounded-xl h-9 text-sm" onClick={() => act().duplicateField(selectedId!)}>
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicate
        </Button>
        <Button variant="destructive" className="flex-1 rounded-xl h-9 text-sm" onClick={() => act().deleteSelected()}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
        </Button>
      </div>
    </div>
  );
});

interface FieldListProps {
  fields:     ExtField[];
  selectedId: string | null;
  onSelect:   (id: string) => void;
}
const FieldList = memo(({ fields, selectedId, onSelect }: FieldListProps) => (
  <div className="border-t border-white/[0.08] p-4 bg-white/[0.02]">
    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Fields ({fields.length})</p>
    <div className="space-y-0.5 max-h-44 overflow-y-auto">
      {fields.map(f => (
        <button key={f.id} type="button" onClick={() => onSelect(f.id)}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-between gap-2 border ${
            selectedId === f.id ? "bg-amber-400/10 text-amber-400 font-semibold border-amber-400/20" : "hover:bg-white/[0.06] text-slate-500 border-transparent"
          }`}>
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color ?? "#1a1a1a" }} />
            {f.name}
          </span>
          <span className="text-slate-600 text-[10px] flex-shrink-0">
            {FIELD_TYPES.find(ft => ft.value === f.type)?.label ?? f.type}
          </span>
        </button>
      ))}
    </div>
  </div>
));

// ─── Main component ───────────────────────────────────────────────────────────
export default function TemplateEditor() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;

  const { data: existingTemplate, isLoading: loadingTemplate } = useTemplate(id || "");
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const { toast } = useToast();

  const [name,       setName]     = useState("New Template");
  const [fileURL,    setFileURL]  = useState("");
  const [fields,     setFields]   = useState<ExtField[]>([]);
  const [selectedId, selectShape] = useState<string | null>(null);
  const [uploading,  setUploading]= useState(false);
  const [zoom,       setZoom]     = useState(0.85);
  const [panelOpen,  setPanelOpen]= useState(false);
  const [pan,        setPan]      = useState({ x: 0, y: 0 });

  const stageRef     = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef      = useRef(zoom);
  const panRef       = useRef({ x: 0, y: 0 });

  // ── Panning refs ─────────────────────────────────────────────────────────
  const isPanning   = useRef(false);
  const panStart    = useRef({ x: 0, y: 0 });
  const panOrigin   = useRef({ x: 0, y: 0 });

  // Auto-scroll refs kept for future use
  const autoScrollRafId = useRef<number | null>(null);
  const lastPointerVP   = useRef({ x: 0, y: 0 });
  const draggingNode    = useRef<any>(null);
  const stopAutoScroll  = useCallback(() => {
    if (autoScrollRafId.current !== null) { cancelAnimationFrame(autoScrollRafId.current); autoScrollRafId.current = null; }
  }, []);
  const startAutoScroll = useCallback(() => {}, []);

  // Stale-ref mutable callbacks for PropertiesPanel (avoids breaking memo)
  const selectedIdRef = useRef(selectedId);
  const fieldsRef     = useRef(fields);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { fieldsRef.current     = fields;     }, [fields]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current  = pan;  }, [pan]);

  // actionsRef: stable object whose methods always read current state via refs
  const actionsRef = useRef<PanelActions>({
    updateSelected: (changes) => {
      const sid = selectedIdRef.current;
      if (!sid) return;
      setFields(prev => prev.map(f => f.id === sid ? { ...f, ...changes } : f));
    },
    duplicateField: (fieldId) => {
      const src = fieldsRef.current.find(f => f.id === fieldId);
      if (!src) return;
      const copy: ExtField = { ...src, id: uuidv4(), name: `${src.name}_copy`, x: src.x + 16, y: src.y + 16 };
      setFields(prev => [...prev, copy]);
      selectShape(copy.id);
      toast({ title: "Field duplicated", description: "Box copied with identical dimensions." });
    },
    deleteSelected: () => {
      const sid = selectedIdRef.current;
      if (!sid) return;
      setFields(prev => prev.filter(f => f.id !== sid));
      selectShape(null);
      setPanelOpen(false);
    },
  });

  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setFileURL(existingTemplate.fileURL);
      setFields((existingTemplate.fields || []) as ExtField[]);
    }
  }, [existingTemplate]);

  // ── Fit to container ──────────────────────────────────────────────────────
  const fitToContainer = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth  - PAD * 2;
    const ch = containerRef.current.clientHeight - PAD * 2;
    const z  = parseFloat(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(cw / A4_WIDTH, ch / A4_HEIGHT, 1.5))).toFixed(2));
    const newPan = {
      x: Math.max(PAD, (containerRef.current.clientWidth  - A4_WIDTH  * z) / 2),
      y: Math.max(PAD, (containerRef.current.clientHeight - A4_HEIGHT * z) / 2),
    };
    setZoom(z);     zoomRef.current = z;
    setPan(newPan); panRef.current  = newPan;
  }, []);

  useEffect(() => {
    fitToContainer();
    window.addEventListener("resize", fitToContainer);
    setTimeout(fitToContainer, 100);
    return () => window.removeEventListener("resize", fitToContainer);
  }, [fitToContainer, fileURL]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const applyZoom = useCallback((nextZ: number, anchorX?: number, anchorY?: number) => {
    const z   = parseFloat(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZ)).toFixed(2));
    const cur = zoomRef.current;
    setPan(prev => {
      let np: { x: number; y: number };
      if (anchorX === undefined || anchorY === undefined) {
        const cx = prev.x + (A4_WIDTH  * cur) / 2;
        const cy = prev.y + (A4_HEIGHT * cur) / 2;
        np = { x: cx - (A4_WIDTH * z) / 2, y: cy - (A4_HEIGHT * z) / 2 };
      } else {
        const cx = (anchorX - prev.x) / cur;
        const cy = (anchorY - prev.y) / cur;
        np = { x: anchorX - cx * z, y: anchorY - cy * z };
      }
      panRef.current = np;
      return np;
    });
    setZoom(z); zoomRef.current = z;
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "=") { e.preventDefault(); applyZoom(zoomRef.current + ZOOM_STEP); }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") { e.preventDefault(); applyZoom(zoomRef.current - ZOOM_STEP); }
      if (e.key === "Escape") { selectShape(null); setPanelOpen(false); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
        setFields(prev => prev.filter(f => f.id !== selectedIdRef.current));
        selectShape(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyZoom]);

  useEffect(() => { if (selectedId) setPanelOpen(true); }, [selectedId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => { lastPointerVP.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // ── Pan logic ─────────────────────────────────────────────────────────────
  // We use native mousedown on the container (not React synthetic) so we can
  // query the Konva stage synchronously before deciding whether to pan.
  // Logic: if the click lands on a draggable Konva node → let Konva handle it.
  //        if the click lands on the stage background → start panning.
  const onContainerPointerDown  = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {}, []);
  const onContainerPointerMove  = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {}, []);
  const onContainerPointerUp    = useCallback(() => {}, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      // Skip interactive HTML elements
      const path = e.composedPath() as HTMLElement[];
      if (path.some(el => {
        const tag = (el as HTMLElement).tagName;
        return tag === "BUTTON" || tag === "LABEL" ||
               (tag === "INPUT" && (el as HTMLInputElement).type === "file");
      })) return;

      // All field interaction is via HTML overlay handles (not Konva),
      // so anything on the canvas background should pan.
      // Nothing interactive under pointer — start panning
      isPanning.current = true;
      panStart.current  = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...panRef.current };

      const onMove = (ev: MouseEvent) => {
        if (!isPanning.current) return;
        const dx = ev.clientX - panStart.current.x;
        const dy = ev.clientY - panStart.current.y;
        const np = { x: panOrigin.current.x + dx, y: panOrigin.current.y + dy };
        panRef.current = np;
        setPan(np);
      };
      const onUp = () => {
        isPanning.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup",   onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup",   onUp);
    };

    container.addEventListener("mousedown", onMouseDown, false);

    // ── Touch panning (single finger) ────────────────────────────────────────
    let touchPanId: number | null = null;
    let touchStart = { x: 0, y: 0 };
    let touchOrigin = { x: 0, y: 0 };

    const onTouchStartNative = (e: TouchEvent) => {
  if (e.touches.length !== 1) return;
  // Don't pan if touch started on an interactive overlay element (handles, buttons)
  const path = e.composedPath() as HTMLElement[];
  if (path.some(el => {
    const tag = (el as HTMLElement).tagName;
    return tag === "BUTTON" || ((el as HTMLElement).style?.pointerEvents === "all");
  })) return;
  const t = e.touches[0];
  touchPanId = t.identifier;
  touchStart  = { x: t.clientX, y: t.clientY };
  touchOrigin = { ...panRef.current };
};
    const onTouchMoveNative = (e: TouchEvent) => {
      if (touchPanId === null) return;
      const t = Array.from(e.touches).find(tt => tt.identifier === touchPanId);
      if (!t) return;
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const np = { x: touchOrigin.x + dx, y: touchOrigin.y + dy };
      panRef.current = np;
      setPan(np);
    };
    const onTouchEndNative = () => { touchPanId = null; };

    container.addEventListener("touchstart", onTouchStartNative, { passive: true });
    container.addEventListener("touchmove",  onTouchMoveNative,  { passive: true });
    container.addEventListener("touchend",   onTouchEndNative,   { passive: true });

    return () => {
      container.removeEventListener("mousedown",  onMouseDown,       false);
      container.removeEventListener("touchstart", onTouchStartNative);
      container.removeEventListener("touchmove",  onTouchMoveNative);
      container.removeEventListener("touchend",   onTouchEndNative);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wheel ─────────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      applyZoom(zoomRef.current + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), e.clientX - rect.left, e.clientY - rect.top);
    } else {
      const np = { x: panRef.current.x - e.deltaX, y: panRef.current.y - e.deltaY };
      panRef.current = np; setPan(np);
    }
  }, [applyZoom]);

  // ── Pinch ─────────────────────────────────────────────────────────────────
  const lastPinchDist = useRef<number | null>(null);
  const onTouchStart  = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) lastPinchDist.current = null;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    if (lastPinchDist.current !== null && containerRef.current) {
      const ratio = dist / lastPinchDist.current;
      const nextZ = parseFloat(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current * ratio)).toFixed(2));
      const rect  = containerRef.current.getBoundingClientRect();
      applyZoom(nextZ, (t0.clientX + t1.clientX)/2 - rect.left, (t0.clientY + t1.clientY)/2 - rect.top);
    }
    lastPinchDist.current = dist;
  }, [applyZoom]);
  const onTouchEnd = useCallback(() => { lastPinchDist.current = null; }, []);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const imageUrl = file.type === "application/pdf" ? url.replace("/upload/", "/upload/pg_1,f_jpg/") : url;
      setFileURL(imageUrl);
      if (isNew) setName(file.name.split(".")[0]);
      setTimeout(fitToContainer, 200);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addField = () => {
    const f: ExtField = {
      id: uuidv4(), name: `Field_${fields.length + 1}`, type: "description",
      x: 100, y: 100, width: 180, height: 30, fontSize: 12, alignment: "left",
      page: 1, fontFamily: "Helvetica", color: "#1a1a1a", verticalAlignment: "top",
    };
    setFields(prev => [...prev, f]);
    selectShape(f.id);
  };

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

  // Deselect when clicking stage background
  const onStageMouseDown = (e: any) => {
    if (e.target === e.target.getStage() || e.target.name() === "bg") {
      selectShape(null);
    }
  };

  if (!isNew && loadingTemplate) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0d0f14]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-8 h-8 text-amber-400" />
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
    <div className="fixed inset-0 flex flex-col bg-[#0d0f14] z-50">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-[#0d0f14] border-b border-white/[0.08] flex items-center justify-between px-3 sm:px-4 shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/templates")}
            className="text-slate-500 rounded-xl hover:bg-white/[0.06] h-9 w-9 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-5 w-px bg-white/[0.08] flex-shrink-0" />
          <Input value={name} onChange={e => setName(e.target.value)}
            className="font-semibold text-white border-transparent hover:border-white/[0.08] focus:border-amber-400/60 h-9 w-32 sm:w-52 shadow-none bg-transparent text-sm px-2"
            placeholder="Template Name" />
        </div>

        {fileURL && (
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-white/[0.06] border border-white/[0.08] rounded-xl px-2 py-1.5 select-none">
            <button type="button" title="Zoom out (Ctrl -)" disabled={zoom <= ZOOM_MIN}
              onClick={() => applyZoom(zoom - ZOOM_STEP)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white disabled:opacity-30">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button type="button" onClick={fitToContainer} title="Click to fit screen"
              className="min-w-[52px] text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors text-center px-1">
              {zoomPct}%
            </button>
            <button type="button" title="Zoom in (Ctrl +)" disabled={zoom >= ZOOM_MAX}
              onClick={() => applyZoom(zoom + ZOOM_STEP)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white disabled:opacity-30">
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
            <button type="button" onClick={fitToContainer} title="Fit to screen"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setPanelOpen(v => !v)}
            className="md:hidden text-slate-500 rounded-xl hover:bg-white/[0.06] h-9 w-9 relative">
            <Settings2 className="w-4 h-4" />
            {selectedId && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </Button>
          <Button variant="outline" onClick={() => setLocation("/templates")} className="hidden sm:flex rounded-xl h-9 text-sm">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || uploading} className="rounded-xl h-9 text-sm px-3 sm:px-4">
            {isSaving
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /><span className="hidden sm:inline">Saving…</span></>
              : <><Save className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Save Template</span></>
            }
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left toolbar ───────────────────────────────────────────────── */}
        <aside className="w-12 sm:w-14 bg-[#0d0f14] border-r border-white/[0.08] flex flex-col items-center py-3 sm:py-4 gap-2 z-10 shrink-0">
          <button type="button" title="Add field" onClick={addField}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white transition-all">
            <Type className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* FIX #1: Plain <label> — NOT inside any button or pointer-capturing element.
              The container's onPointerDown checks composedPath() for LABEL/file INPUT
              and returns early, so the browser's native file dialog opens freely. */}
          <label title="Upload template"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer">
            <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>

          <div className="w-5 sm:w-6 h-px bg-white/[0.08] my-1" />

          <button type="button" title="Duplicate selected field" disabled={!selectedId}
            onClick={() => { if (selectedId) actionsRef.current.duplicateField(selectedId); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-30">
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button type="button" title="Delete selected field (Del)" disabled={!selectedId}
            onClick={() => actionsRef.current.deleteSelected()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-30">
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </aside>

        {/* ── Canvas viewport ─────────────────────────────────────────────── */}
        <main
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          style={{
            background: "#13161c",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            cursor: !fileURL ? "default" : selectedId ? "default" : "grab",
            touchAction: "none",
          }}
          onPointerDown={onContainerPointerDown}
          onPointerMove={onContainerPointerMove}
          onPointerUp={onContainerPointerUp}
          onPointerLeave={onContainerPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Upload prompt */}
          {!fileURL && !uploading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center">
                <label className="cursor-pointer group block">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/[0.03] rounded-3xl flex flex-col items-center justify-center mx-auto mb-4 sm:mb-5 border-2 border-dashed border-white/[0.10] group-hover:border-amber-400/60 group-hover:bg-amber-400/5 group-hover:shadow-xl group-hover:shadow-amber-400/10 transition-all duration-300">
                    <UploadCloud className="w-8 h-8 sm:w-9 sm:h-9 text-slate-500 group-hover:text-amber-400 transition-colors mb-1" />
                    <span className="text-[10px] text-slate-500 group-hover:text-amber-400 font-semibold uppercase tracking-wide transition-colors">Upload</span>
                  </div>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                </label>
                <h2 className="text-base sm:text-lg font-semibold text-slate-300">Upload Template Background</h2>
                <p className="text-slate-500 mt-1.5 max-w-xs mx-auto text-xs sm:text-sm leading-relaxed">
                  Upload a PDF or image, then draw boxes over your invoice layout.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4 text-xs text-slate-600">
                  {["PNG / JPG","PDF","Max 10MB"].map(t => (
                    <span key={t} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/[0.04] rounded-2xl px-8 py-7 flex flex-col items-center gap-4 border border-white/[0.08]">
                <div className="w-12 h-12 rounded-full border-4 border-white/[0.08] border-t-amber-400 animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-slate-200">Uploading…</p>
                  <p className="text-xs text-slate-500 mt-0.5">Please wait</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Canvas paper ─────────────────────────────────────────────── */}
          {fileURL && (
            <div style={{
              position: "absolute", left: pan.x, top: pan.y,
              width: A4_WIDTH, height: A4_HEIGHT,
              transform: `scale(${zoom})`, transformOrigin: "top left",
              willChange: "transform, left, top",
            }}>
              <div style={{
                width: A4_WIDTH, height: A4_HEIGHT,
                boxShadow: "0 4px 8px rgba(0,0,0,0.4), 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)",
                borderRadius: 2, overflow: "visible", position: "relative",
              }}>
                <Stage
                  width={A4_WIDTH} height={A4_HEIGHT}
                  ref={stageRef}
                  onMouseDown={onStageMouseDown}
                  onTouchStart={onStageMouseDown}
                >
                  <BackgroundImage url={fileURL} />
                  <Layer>
                    {fields.map(field => {
                      const isSelected = field.id === selectedId;
                      const isDesc     = field.type === "description";

                      return [
                        <Rect
                          key={`rect-${field.id}`}
                          id={field.id}
                          x={field.x} y={field.y}
                          width={field.width} height={field.height}
                          fill={isSelected ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.05)"}
                          stroke={isSelected ? "#f59e0b" : "#fcd34d"}
                          strokeWidth={isSelected ? 1.5 : 1}
                          cornerRadius={2}
                          onClick={() => selectShape(field.id)}
                          onTap={() => selectShape(field.id)}
                        />,
                        <KonvaText
                          key={`text-${field.id}`}
                          x={field.x} y={field.y}
                          width={field.width} height={field.height}
                          text={getFieldLabel(field.type)}
                          fontSize={Math.min(field.fontSize, field.height - 4)}
                          fontFamily={field.fontFamily ?? "Helvetica"}
                          fill={field.color ?? "#1a1a1a"}
                          align={(field.alignment ?? "left") as any}
                          verticalAlign={(field.verticalAlignment ?? "top") as any}
                          padding={4}
                          listening={false}
                          wrap={isDesc ? "word" : "none"}
                          ellipsis={!isDesc}
                        />,
                      ];
                    })}
                  </Layer>
                </Stage>

                {/* Overlay is INSIDE the scaled div — inherits scale transform,
                    so coords are in canvas-space (no zoom multiplication needed) */}
                {selectedField && (() => {
                  const f     = selectedField;
                  const bx    = f.x;
                  const by    = f.y;
                  const bw    = f.width;
                  const bh    = f.height;
                  const cx    = bx + bw / 2;
                  const z     = zoom; // only used for inverse-scaling handle size
                  // Keep handle size constant in screen pixels regardless of zoom
                  const HSIZE = 10 / z;
                  const STEM  = 18 / z;
                  const CIRC  = 20 / z;

                  const startWindowDrag = (
                    e: React.PointerEvent,
                    onMove: (dx: number, dy: number) => void,
                    onDone?: () => void,
                  ) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const startX = e.clientX, startY = e.clientY;
                    const onPM = (ev: PointerEvent) => onMove(
                      (ev.clientX - startX) / z,
                      (ev.clientY - startY) / z,
                    );
                    const onPU = () => {
                      window.removeEventListener("pointermove", onPM);
                      window.removeEventListener("pointerup",   onPU);
                      onDone?.();
                    };
                    window.addEventListener("pointermove", onPM);
                    window.addEventListener("pointerup",   onPU);
                  };

                  const resizeHandles: {
                    key: string; style: React.CSSProperties; cursor: string;
                    onMove: (dx: number, dy: number, orig: typeof f) => Partial<typeof f>;
                  }[] = [
                    { key:"nw", cursor:"nw-resize", style:{ left:bx-HSIZE/2,    top:by-HSIZE/2        },
                      onMove:(dx,dy,o)=>({ x:o.x+dx, y:o.y+dy, width:Math.max(20,o.width-dx),  height:Math.max(20,o.height-dy) }) },
                    { key:"ne", cursor:"ne-resize", style:{ left:bx+bw-HSIZE/2, top:by-HSIZE/2        },
                      onMove:(dx,dy,o)=>({             y:o.y+dy, width:Math.max(20,o.width+dx),  height:Math.max(20,o.height-dy) }) },
                    { key:"se", cursor:"se-resize", style:{ left:bx+bw-HSIZE/2, top:by+bh-HSIZE/2     },
                      onMove:(dx,dy,o)=>({                       width:Math.max(20,o.width+dx),  height:Math.max(20,o.height+dy) }) },
                    { key:"sw", cursor:"sw-resize", style:{ left:bx-HSIZE/2,    top:by+bh-HSIZE/2     },
                      onMove:(dx,dy,o)=>({ x:o.x+dx,            width:Math.max(20,o.width-dx),  height:Math.max(20,o.height+dy) }) },
                    { key:"n",  cursor:"n-resize",  style:{ left:cx-HSIZE/2,    top:by-HSIZE/2        },
                      onMove:(_x,dy,o)=>({            y:o.y+dy,                                 height:Math.max(20,o.height-dy) }) },
                    { key:"s",  cursor:"s-resize",  style:{ left:cx-HSIZE/2,    top:by+bh-HSIZE/2     },
                      onMove:(_x,dy,o)=>({                                                       height:Math.max(20,o.height+dy) }) },
                    { key:"e",  cursor:"e-resize",  style:{ left:bx+bw-HSIZE/2, top:by+bh/2-HSIZE/2   },
                      onMove:(dx,_y,o)=>({                       width:Math.max(20,o.width+dx)               }) },
                    { key:"w",  cursor:"w-resize",  style:{ left:bx-HSIZE/2,    top:by+bh/2-HSIZE/2   },
                      onMove:(dx,_y,o)=>({ x:o.x+dx,            width:Math.max(20,o.width-dx)               }) },
                  ];

                  return (
                    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"visible" }}>
                      {resizeHandles.map(h => {
                        const origRef = { current: f };
                        return (
                          <div key={h.key}
                            style={{
                              position:"absolute", width:HSIZE, height:HSIZE,
                              background:"white", border:`${1.5/z}px solid #f59e0b`,
                              borderRadius:2/z, cursor:h.cursor,
                              pointerEvents:"all", touchAction:"none",
                              ...h.style,
                            }}
                            onPointerDown={e => {
                              origRef.current = { ...f };
                              startWindowDrag(e, (dx,dy) => {
                                setFields(prev => prev.map(pf =>
                                  pf.id === f.id ? { ...pf, ...h.onMove(dx,dy,origRef.current) } : pf
                                ));
                              });
                            }}
                          />
                        );
                      })}

                      {/* Drag stem */}
                      <div style={{ position:"absolute", left:cx-0.5/z, top:by+bh, width:1/z, height:STEM, background:"#f59e0b", pointerEvents:"none" }} />
                      {/* Drag circle */}
                      <div
                        style={{
                          position:"absolute", left:cx-CIRC/2, top:by+bh+STEM,
                          width:CIRC, height:CIRC,
                          background:"#f59e0b", border:`${2/z}px solid white`,
                          borderRadius:"50%", cursor:"move",
                          pointerEvents:"all", touchAction:"none",
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}
                        title="Drag to move"
                        onPointerDown={e => {
                          const origX = f.x, origY = f.y;
                          let nx = origX, ny = origY;
                          startWindowDrag(e,
                            (dx,dy) => {
                              nx = origX+dx; ny = origY+dy;
                              setFields(prev => prev.map(pf => pf.id===f.id ? {...pf,x:nx,y:ny} : pf));
                            },
                            () => setFields(prev => prev.map(pf => pf.id===f.id ? {...pf,x:nx,y:ny} : pf)),
                          );
                        }}
                      >
                        <svg width={11/z} height={11/z} viewBox="0 0 11 11" fill="none">
                          <path d="M5.5 1v9M1 5.5h9M5.5 1L3.5 3M5.5 1l2 2M5.5 10L3.5 8M5.5 10l2-2M1 5.5L3 3.5M1 5.5L3 7.5M10 5.5L8 3.5M10 5.5L8 7.5" stroke="#1a1a1a" strokeWidth={1.2/z} strokeLinecap="round"/>
                        </svg>
                      </div>

                      {/* Duplicate button */}
                      <button type="button"
                        onClick={() => actionsRef.current.duplicateField(f.id)}
                        style={{
                          position:"absolute",
                          left: bx + bw + 6/z,
                          top:  by,
                          pointerEvents:"all",
                          fontSize: `${10/z}px`,
                          padding: `${2/z}px ${6/z}px`,
                          transform: `scale(${1})`, // no extra scale needed
                        }}
                        className="bg-amber-400 text-slate-900 font-bold rounded-md shadow-lg hover:bg-amber-300 active:scale-95 whitespace-nowrap flex items-center gap-1"
                      >
                        <Copy style={{ width:10/z, height:10/z }} /> Copy
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* (overlay is now inside the canvas paper scaled div above) */}

          {/* ── Zoom slider ─────────────────────────────────────────────── */}
          {fileURL && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1a1d24]/95 backdrop-blur-sm border border-white/[0.08] rounded-2xl shadow-xl px-3 py-2 z-20 select-none"
              onPointerDown={e => e.stopPropagation()}>
              <button type="button" title="Zoom out" disabled={zoom <= ZOOM_MIN}
                onClick={() => applyZoom(zoom - ZOOM_STEP)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white disabled:opacity-30">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input type="range"
                min={Math.round(ZOOM_MIN * 100)} max={Math.round(ZOOM_MAX * 100)} value={zoomPct}
                onChange={e => applyZoom(Number(e.target.value) / 100)}
                className="w-20 sm:w-24 h-1.5 accent-amber-400 cursor-pointer" />
              <button type="button" title="Zoom in" disabled={zoom >= ZOOM_MAX}
                onClick={() => applyZoom(zoom + ZOOM_STEP)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white disabled:opacity-30">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-slate-500 w-9 text-right tabular-nums">{zoomPct}%</span>
              <div className="w-px h-3 bg-white/[0.08]" />
              <button type="button" title="Fit to screen" onClick={fitToContainer}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </main>

        {/* ── Right panel — desktop ───────────────────────────────────────── */}
        <aside className="hidden md:flex w-80 bg-[#0d0f14] border-l border-white/[0.08] flex-col z-10 shrink-0">
          <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Properties</h3>
            {selectedId && (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-semibold border border-amber-400/20">
                Field selected
              </span>
            )}
          </div>
          <PropertiesPanel selectedId={selectedId} selectedField={selectedField} actionsRef={actionsRef} />
          {fields.length > 0 && <FieldList fields={fields} selectedId={selectedId} onSelect={selectShape} />}
        </aside>

        {/* ── Right panel — mobile bottom drawer ─────────────────────────── */}
        {panelOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
            <div className="relative bg-[#0d0f14] border-t border-white/[0.08] rounded-t-2xl z-10 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-300">
              <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm">Properties</h3>
                  {selectedId && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-semibold border border-amber-400/20">
                      Field selected
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => setPanelOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.08] hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <PropertiesPanel selectedId={selectedId} selectedField={selectedField} actionsRef={actionsRef} />
                {fields.length > 0 && <FieldList fields={fields} selectedId={selectedId} onSelect={selectShape} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}