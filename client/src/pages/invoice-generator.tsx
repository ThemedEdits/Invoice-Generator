import { useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useTemplates } from "@/hooks/use-templates";
import { useCustomers } from "@/hooks/use-customers";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Download, Plus, Trash2, CheckCircle2, FileText } from "lucide-react";
import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import { useToast } from "@/hooks/use-toast";
import {
  FIELD_TYPES, AUTO_COMPUTED_FIELDS, FieldTypeValue,
  hexToRgb01, toPdfLibFontName, wrapText,
} from "./template-editor";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNum = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;

const formatCurrencyInput = (raw: string) => {
  const digits = raw.replace(/[^0-9.]/g, "");
  const parts = digits.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.slice(0, 2).join(".");
};

// Line height multiplier used in PDF to match visual spacing
const LINE_HEIGHT_RATIO = 1.35;
// Gap between line-item rows (points)
const ROW_GAP = 6;

// ─── Component ────────────────────────────────────────────────────────────────
export default function InvoiceGenerator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: templates = [], isLoading: loadingTpls } = useTemplates();
  const { data: customers = [], isLoading: loadingCusts } = useCustomers();
  const createInvoice = useCreateInvoice();

  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, lineTotal: 0 },
  ]);
  const [taxPercent, setTaxPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("0");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");

  const activeTemplate = templates.find(t => t.id === templateId);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);
  const taxAmt = subtotal * (parseNum(taxPercent) / 100);
  const discountAmt = parseNum(discountAmount);
  const paidAmt = parseNum(amountPaid);
  const grandTotal = subtotal + taxAmt - discountAmt;
  const remainingBalance = grandTotal - paidAmt;

  // ── Customer auto-fill ─────────────────────────────────────────────────────
  const handleCustomerSelect = (cid: string) => {
    setCustomerId(cid);
    const customer = customers.find(c => c.id === cid);
    if (customer && activeTemplate) {
      const nv = { ...fieldValues };
      activeTemplate.fields.forEach(f => {
        if (f.type === "client_name") nv[f.type] = customer.name;
        if (f.type === "client_address") nv[f.type] = customer.address || "";
      });
      setFieldValues(nv);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!templateId || !customerId)) {
      toast({ title: "Please select a template and customer", variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  // ── Line item management ───────────────────────────────────────────────────
  const updateLineItem = (idx: number, key: keyof LineItem, val: string | number) => {
    setLineItems(lineItems.map((li, i) => {
      if (i !== idx) return li;
      const next = { ...li, [key]: val };
      next.lineTotal = next.quantity * next.unitPrice;
      return next;
    }));
  };

  const addLineItem = () => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]);
  const removeLineItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));

  // ── Computed value resolver ────────────────────────────────────────────────
  const getComputedValue = (type: string): string => {
    switch (type) {
      case "subtotal": return `Rs ${fmt(subtotal)}`;
      case "grand_total": return `Rs ${fmt(grandTotal)}`;
      case "remaining_balance": return `Rs ${fmt(remainingBalance)}`;
      default: return "";
    }
  };

  const headerFieldTypes: FieldTypeValue[] = [
    "invoice_number", "invoice_date", "due_date", "client_name", "client_address",
  ];

  const templateHasField = (type: FieldTypeValue) =>
    activeTemplate?.fields.some(f => f.type === type);

  // ── PDF Generation ─────────────────────────────────────────────────────────
  const generatePDF = async () => {
    if (!activeTemplate) return;
    setIsGenerating(true);

    try {
      const templateBytes = await fetch(activeTemplate.fileURL).then(r => r.arrayBuffer());

      let pdfDoc: PDFDocument;
      try {
        pdfDoc = await PDFDocument.load(templateBytes);
      } catch {
        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        let img;
        try { img = await pdfDoc.embedJpg(templateBytes); }
        catch { img = await pdfDoc.embedPng(templateBytes); }
        page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
      }

      const pages = pdfDoc.getPages();
      if (!pages.length) pdfDoc.addPage([595.28, 841.89]);
      const firstPage = pages[0];
      const { height } = firstPage.getSize();

      // ── Font cache ───────────────────────────────────────────────────────
      const fontCache: Record<string, PDFFont> = {};
      const getFont = async (fontFamily?: string): Promise<PDFFont> => {
        const key = toPdfLibFontName(fontFamily ?? "Helvetica");
        if (!fontCache[key]) {
          fontCache[key] = await pdfDoc.embedFont(
            StandardFonts[key as keyof typeof StandardFonts] ?? StandardFonts.Helvetica
          );
        }
        return fontCache[key];
      };

      // ── Alignment X helper ───────────────────────────────────────────────
      const getDrawX = (text: string, font: PDFFont, size: number, fx: number, fw: number, align?: string) => {
        if (align === "center") return fx + (fw - font.widthOfTextAtSize(text, size)) / 2;
        if (align === "right") return fx + fw - font.widthOfTextAtSize(text, size);
        return fx;
      };

      // ── Draw non-line-item fields ────────────────────────────────────────
      for (const field of activeTemplate.fields) {
        const f = field as any;
        const type = field.type as FieldTypeValue;
        if (["description", "quantity", "unit_price", "line_total"].includes(type)) continue;

        let text = "";
        if (AUTO_COMPUTED_FIELDS.includes(type)) {
          text = getComputedValue(type);
        } else if (type === "tax") {
          text = `Rs ${fmt(taxAmt)}`;
        } else if (type === "discount") {
          text = `Rs ${fmt(discountAmt)}`;
        } else if (type === "amount_paid") {
          text = `Rs ${fmt(paidAmt)}`;
        } else {
          text = fieldValues[type] || "";
        }
        if (!text) continue;

        const font = await getFont(f.fontFamily);
        const [r, g, b] = hexToRgb01(f.color ?? "#1a1a1a");
        const drawX = getDrawX(text, font, field.fontSize, field.x, field.width, f.alignment);
        const drawY = height - field.y - field.fontSize;

        firstPage.drawText(text, { x: drawX, y: drawY, size: field.fontSize, font, color: rgb(r, g, b) });
      }

      // ── Draw line items with smart row height ────────────────────────────
      const descField = activeTemplate.fields.find(f => f.type === "description") as any;
      const qtyField = activeTemplate.fields.find(f => f.type === "quantity") as any;
      const upField = activeTemplate.fields.find(f => f.type === "unit_price") as any;
      const ltField = activeTemplate.fields.find(f => f.type === "line_total") as any;

      if (descField || qtyField || upField || ltField) {
        const descFont = descField ? await getFont(descField.fontFamily) : null;
        const qtyFont = qtyField ? await getFont(qtyField.fontFamily) : null;
        const upFont = upField ? await getFont(upField.fontFamily) : null;
        const ltFont = ltField ? await getFont(ltField.fontFamily) : null;

        const firstRowBaselineY = descField
          ? height - descField.y - descField.fontSize
          : qtyField
            ? height - qtyField.y - qtyField.fontSize
            : upField
              ? height - upField.y - upField.fontSize
              : ltField
                ? height - ltField.y - ltField.fontSize
                : height - 100;

        let currentTopY = firstRowBaselineY + (descField?.fontSize ?? qtyField?.fontSize ?? 12);

        for (let rowIdx = 0; rowIdx < lineItems.length; rowIdx++) {
          const li = lineItems[rowIdx];

          let descLines: string[] = [""];
          let descLineHeight = 0;
          if (descField && descFont) {
            descLines = wrapText(li.description, descFont, descField.fontSize, descField.width - 8);
            descLineHeight = descField.fontSize * LINE_HEIGHT_RATIO;
          }

          const descTextHeight = descLines.length * descLineHeight;
          const singleLineH = (descField?.fontSize ?? qtyField?.fontSize ?? qtyField?.fontSize ?? 12) * LINE_HEIGHT_RATIO;
          const rowHeight = Math.max(descTextHeight, singleLineH);
          const firstLineY = currentTopY - descField?.fontSize ?? singleLineH;

          if (descField && descFont) {
            const [r, g, b] = hexToRgb01(descField.color ?? "#1a1a1a");
            descLines.forEach((line, li_idx) => {
              const lineY = firstLineY - li_idx * descLineHeight;
              const drawX = getDrawX(line, descFont, descField.fontSize, descField.x, descField.width, descField.alignment);
              firstPage.drawText(line, { x: drawX, y: lineY, size: descField.fontSize, font: descFont, color: rgb(r, g, b) });
            });
          }

          if (qtyField && qtyFont) {
            const [r, g, b] = hexToRgb01(qtyField.color ?? "#1a1a1a");
            const text = String(li.quantity);
            const drawX = getDrawX(text, qtyFont, qtyField.fontSize, qtyField.x, qtyField.width, qtyField.alignment);
            firstPage.drawText(text, { x: drawX, y: firstLineY, size: qtyField.fontSize, font: qtyFont, color: rgb(r, g, b) });
          }

          if (upField && upFont) {
            const [r, g, b] = hexToRgb01(upField.color ?? "#1a1a1a");
            const text = `${fmt(li.unitPrice)}`;
            const drawX = getDrawX(text, upFont, upField.fontSize, upField.x, upField.width, upField.alignment);
            firstPage.drawText(text, { x: drawX, y: firstLineY, size: upField.fontSize, font: upFont, color: rgb(r, g, b) });
          }

          if (ltField && ltFont) {
            const [r, g, b] = hexToRgb01(ltField.color ?? "#1a1a1a");
            const text = `${fmt(li.lineTotal)}`;
            const drawX = getDrawX(text, ltFont, ltField.fontSize, ltField.x, ltField.width, ltField.alignment);
            firstPage.drawText(text, { x: drawX, y: firstLineY, size: ltField.fontSize, font: ltFont, color: rgb(r, g, b) });
          }

          currentTopY -= rowHeight + ROW_GAP;
        }
      }

      // ── Save & upload ──────────────────────────────────────────────────────
      const pdfBytes = await pdfDoc.save();
      const pdfFile = new File([pdfBytes], `invoice-${Date.now()}.pdf`, { type: "application/pdf" });
      const fileUrl = await uploadToCloudinary(pdfFile);
      setGeneratedUrl(fileUrl);

      await createInvoice.mutateAsync({
        templateId, customerId,
        values: fieldValues,
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          price: li.unitPrice,
          total: li.lineTotal,
        })),
        totals: { subtotal, tax: taxAmt, discount: discountAmt, amountPaid: paidAmt, grandTotal, remainingBalance },
        status: "Draft",
        pdfURL: fileUrl,
      });

      setStep(4);
      toast({ title: "Invoice generated successfully!" });

    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", description: "Ensure template is a valid PDF or image.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingTpls || loadingCusts)
    return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const step2Fields = activeTemplate?.fields.filter(f =>
    headerFieldTypes.includes(f.type as FieldTypeValue)
  ) ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">

      {/* Page header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/invoices")} className="text-slate-500 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create Invoice</h1>
          <p className="text-slate-500 mt-1">Step {step} of 4</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex space-x-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-primary" : "bg-slate-200"}`} />
        ))}
      </div>

      <div className="bg-white/[0.03] rounded-2xl shadow-xl shadow-black/40 border border-white/[0.19] overflow-hidden backdrop-blur-sm">

        {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-transparent">
            <div className="space-y-4">
              <Label className="text-base font-semibold">1. Select Template</Label>
              <div className="grid grid-cols-2 gap-4">
                {templates.map(t => (
                  <div key={t.id} onClick={() => setTemplateId(t.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 flex items-center ${templateId === t.id
                        ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10"
                        : "border-white/[0.08] hover:border-white/[0.15] bg-white/[0.03]"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${templateId === t.id
                        ? "bg-amber-400/20 text-amber-400"
                        : "bg-white/[0.06] text-slate-400"
                      }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{t.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{(t.fields || []).length} fields</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">2. Select Customer</Label>
              <Select value={customerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04]">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleNext} className="rounded-xl px-8 shadow-md shadow-primary/20">Next Step</Button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && activeTemplate && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/[0.09] text-slate-100 p-4 rounded-xl text-sm">
              Fill in the invoice details for <strong>{activeTemplate.name}</strong>. Line items are next.
            </div>

            {step2Fields.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {step2Fields.map(field => {
                  const type = field.type as FieldTypeValue;
                  const isDate = type === "invoice_date" || type === "due_date";
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label>{FIELD_TYPES.find(ft => ft.value === type)?.label ?? field.name}</Label>
                      <Input
                        type={isDate ? "date" : "text"}
                        value={fieldValues[type] || ""}
                        onChange={e => setFieldValues({ ...fieldValues, [type]: e.target.value })}
                        placeholder={`Enter ${FIELD_TYPES.find(ft => ft.value === type)?.label ?? field.name}`}
                        className="bg-white/[0.04] border-white/[0.08] rounded-xl"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-6">
                No header fields defined. Proceed to add line items.
              </p>
            )}

            <div className="pt-6 border-t border-white/[0.19] flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl">Back</Button>
              <Button onClick={() => setStep(3)} className="rounded-xl px-8 shadow-md shadow-primary/20">Next Step</Button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ─────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="p-4 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLineItem} className="rounded-xl h-8">
                  <Plus className="w-4 h-4 mr-1" /> Add Row
                </Button>
              </div>

              {/* ── Desktop header (hidden on mobile) ── */}
              <div className="hidden sm:grid grid-cols-[1fr_80px_120px_110px_40px] gap-2 px-3 pb-1 border-b border-white/[0.19]">
                {["Description", "Qty", "Unit Price", "Line Total", ""].map((h, i) => (
                  <span key={i} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              {/* ── Desktop rows (hidden on mobile) ── */}
              <div className="hidden sm:flex flex-col gap-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_120px_110px_40px] gap-2 items-start bg-white/[0.04] px-3 py-2.5 rounded-xl border border-white/[0.19]">
                    <textarea
                      placeholder="Item description..."
                      value={item.description}
                      rows={2}
                      onChange={e => updateLineItem(idx, "description", e.target.value)}
                      className="bg-white/[0.03] border-[1.5px] border-white/[0.08] rounded-md text-sm px-3 py-2 resize-none w-full focus:outline-none focus:border-primary"
                      style={{ minHeight: "90px", lineHeight: "1.5" }}
                    />
                    <Input
                      type="number" min={0} step={1} placeholder="1"
                      value={item.quantity || ""}
                      onChange={e => updateLineItem(idx, "quantity", parseInt(e.target.value) || 0)}
                      className="bg-white/[0.03] border-white/[0.08] text-sm h-9 mt-1"
                    />
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rs</span>
                      <Input
                        placeholder="0"
                        value={item.unitPrice ? formatCurrencyInput(String(item.unitPrice)) : ""}
                        onChange={e => updateLineItem(idx, "unitPrice", parseFloat(e.target.value.replace(/,/g, "")) || 0)}
                        className="bg-white/[0.03] border-white/[0.08] text-sm h-9 pl-8"
                      />
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-md h-9 flex items-center px-3 mt-1">
                      <span className="text-sm font-medium text-slate-300">Rs {fmt(item.lineTotal)}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)}
                      disabled={lineItems.length === 1} className="text-slate-400 hover:text-destructive h-9 w-9 mt-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* ── Mobile rows (hidden on desktop) ── */}
              <div className="flex sm:hidden flex-col gap-3">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.04] rounded-xl border border-white/[0.19] p-3 space-y-3">
                    {/* Description — full width, tall */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</span>
                      <textarea
                        placeholder="Item description..."
                        value={item.description}
                        rows={3}
                        onChange={e => updateLineItem(idx, "description", e.target.value)}
                        className="bg-white/[0.03] border-[1.5px] border-white/[0.08] rounded-md text-sm px-3 py-2 resize-none w-full focus:outline-none focus:border-primary"
                        style={{ lineHeight: "1.5" }}
                      />
                    </div>

                    {/* Qty + Unit Price on one row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</span>
                        <Input
                          type="number" min={0} step={1} placeholder="1"
                          value={item.quantity || ""}
                          onChange={e => updateLineItem(idx, "quantity", parseInt(e.target.value) || 0)}
                          className="bg-white/[0.03] border-white/[0.08] text-sm h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rs</span>
                          <Input
                            placeholder="0"
                            value={item.unitPrice ? formatCurrencyInput(String(item.unitPrice)) : ""}
                            onChange={e => updateLineItem(idx, "unitPrice", parseFloat(e.target.value.replace(/,/g, "")) || 0)}
                            className="bg-white/[0.03] border-white/[0.08] text-sm h-9 pl-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Line Total + Delete on one row */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Line Total</span>
                        <p className="text-sm font-bold text-white">Rs {fmt(item.lineTotal)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)}
                        disabled={lineItems.length === 1}
                        className="text-slate-400 hover:text-destructive hover:bg-red-400/10 h-9 w-9">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 text-right">
                {lineItems.length} row{lineItems.length !== 1 ? "s" : ""} · PDF rows auto-size to description length
              </p>
            </div>

            {/* Totals panel */}
            <div className="border-t border-white/[0.19] pt-6 flex justify-end">
              <div className="w-full sm:w-72 space-y-3">

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-100">Rs {fmt(subtotal)}</span>
                </div>

                {templateHasField("discount") && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Discount</span>
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                      <Input value={discountAmount} onChange={e => setDiscountAmount(formatCurrencyInput(e.target.value))} className="h-8 text-right text-sm bg-white/[0.04] border-white/[0.08] pl-7" />
                    </div>
                  </div>
                )}

                {templateHasField("tax") && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tax (%)</span>
                    <div className="relative w-28">
                      <Input type="number" min={0} max={100} value={taxPercent} onChange={e => setTaxPercent(e.target.value)} className="h-8 text-right text-sm bg-white/[0.04] border-white/[0.08]" placeholder="0" />
                    </div>
                  </div>
                )}

                {(templateHasField("tax") || templateHasField("discount")) && (
                  <div className="flex justify-between text-sm text-slate-500 border-t border-white/[0.19] pt-2">
                    {templateHasField("tax") && <span>Tax: Rs {fmt(taxAmt)}</span>}
                    {templateHasField("discount") && <span>Discount: Rs {fmt(discountAmt)}</span>}
                  </div>
                )}

                <div className="flex justify-between text-base font-bold border-t border-white/[0.08] pt-3">
                  <span className="text-white">Grand Total</span>
                  <span className="text-primary">Rs {fmt(grandTotal)}</span>
                </div>

                {templateHasField("amount_paid") && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Amount Paid (Rs)</span>
                    <div className="relative w-28">
                      <Input value={amountPaid} onChange={e => setAmountPaid(formatCurrencyInput(e.target.value))} className="h-8 text-right text-sm bg-white/[0.04] border-white/[0.08] pl-7" />
                    </div>
                  </div>
                )}

                {templateHasField("remaining_balance") && (
                  <div className={`flex justify-between text-sm font-semibold rounded-lg px-3 py-2 ${remainingBalance <= 0 ? "bg-white/[0.09] text-slate-200" : "bg-amber-50 text-amber-700"}`}>
                    <span>Remaining Balance</span>
                    <span>Rs {fmt(Math.max(remainingBalance, 0))}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl">Back</Button>
              <Button onClick={generatePDF} disabled={isGenerating} className="rounded-xl px-8 shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-white font-semibold">
                {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Generate Final PDF
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ─────────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="p-8 sm:p-16 text-center animate-in zoom-in duration-500 flex flex-col items-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-400/10 border border-emerald-400/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Invoice Generated!</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-md mb-8">
              Your invoice has been successfully created, saved, and uploaded to the cloud.
            </p>
            {/* ── Buttons stacked on mobile, side by side on sm+ ── */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button asChild variant="outline" className="rounded-xl h-12 px-6 border-white/[0.08] shadow-sm w-full sm:w-auto">
                <a href={generatedUrl} download={`invoice-${Date.now()}.pdf`} target="_blank" rel="noopener noreferrer">
                  <Download className="w-5 h-5 mr-2" /> Download PDF
                </a>
              </Button>
              <Button asChild className="rounded-xl h-12 px-6 shadow-md shadow-primary/20 w-full sm:w-auto">
                <Link href="/invoices">View All Invoices</Link>
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}