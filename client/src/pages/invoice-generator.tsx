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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Plus, Trash2, CheckCircle2, FileText } from "lucide-react";
import { PDFDocument, rgb } from 'pdf-lib';
import { useToast } from "@/hooks/use-toast";
import { Template } from "@shared/schema";

export default function InvoiceGenerator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: templates = [], isLoading: loadingTpls } = useTemplates();
  const { data: customers = [], isLoading: loadingCusts } = useCustomers();
  const createInvoice = useCreateInvoice();

  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState("");
  const [customerId, setCustomerId] = useState("");
  
  // Form values corresponding to template fields
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  
  const [lineItems, setLineItems] = useState([{ desc: "", qty: 1, price: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");

  const activeTemplate = templates.find(t => t.id === templateId);

  // Auto-fill template fields that might match customer data
  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const customer = customers.find(c => c.id === id);
    if (customer && activeTemplate) {
      const newVals = { ...fieldValues };
      activeTemplate.fields.forEach(f => {
        const lowerName = f.name.toLowerCase();
        if (lowerName.includes("name") || lowerName.includes("client")) newVals[f.name] = customer.name;
        if (lowerName.includes("email")) newVals[f.name] = customer.email;
        if (lowerName.includes("address")) newVals[f.name] = customer.address || "";
        if (lowerName.includes("phone")) newVals[f.name] = customer.phone || "";
        if (lowerName.includes("date")) newVals[f.name] = new Date().toLocaleDateString();
      });
      setFieldValues(newVals);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!templateId || !customerId)) {
      toast({ title: "Please select a template and customer", variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const addLineItem = () => setLineItems([...lineItems, { desc: "", qty: 1, price: 0 }]);
  const updateLineItem = (index: number, key: string, val: string | number) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [key]: val };
    setLineItems(newItems);
  };
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

  const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const tax = subtotal * (taxRate / 100);
  const grandTotal = subtotal + tax - discount;

  const generatePDF = async () => {
    if (!activeTemplate) return;
    setIsGenerating(true);

    try {
      // 1. Fetch original template file
      const templateBytes = await fetch(activeTemplate.fileURL).then(res => res.arrayBuffer());
      
      // 2. Load PDF (if image uploaded as background, we'd create blank PDF and draw image. 
      // Assuming for now they uploaded a PDF to Cloudinary as requested, or Cloudinary provides a PDF format)
      // Note: If Cloudinary returned a JPG, pdf-lib can't load it via load(). 
      // We must check extension.
      let pdfDoc;

      try {
        // Try loading as PDF first
        pdfDoc = await PDFDocument.load(templateBytes);
      } catch {
        // If it fails, treat as image
        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);

        let img;

        try {
          img = await pdfDoc.embedJpg(templateBytes);
        } catch {
          img = await pdfDoc.embedPng(templateBytes);
        }

        page.drawImage(img, {
          x: 0,
          y: 0,
          width: 595.28,
          height: 841.89,
        });
      }

      const pages = pdfDoc.getPages();
      if (!pages.length) pdfDoc.addPage([595.28, 841.89]);
      const firstPage = pages[0];
      const { height } = firstPage.getSize();

      // 3. Draw text fields
      activeTemplate.fields.forEach(field => {
        let textToDraw = fieldValues[field.name] || "";
        
        // Auto calculate totals if field name matches
        if (field.name.toLowerCase() === 'subtotal') textToDraw = `$${subtotal.toFixed(2)}`;
        if (field.name.toLowerCase() === 'tax') textToDraw = `$${tax.toFixed(2)}`;
        if (field.name.toLowerCase() === 'total' || field.name.toLowerCase() === 'grandtotal') textToDraw = `$${grandTotal.toFixed(2)}`;

        // PDF origin is bottom left, Konva is top left
        const pdfY = height - field.y - field.fontSize;
        
        firstPage.drawText(textToDraw, {
          x: field.x,
          y: pdfY,
          size: field.fontSize,
          color: rgb(0.1, 0.1, 0.1),
        });
      });

      // 4. Save and Upload
      const pdfBytes = await pdfDoc.save();
      const pdfFile = new File(
        [pdfBytes],
        `invoice-${Date.now()}.pdf`,
        { type: "application/pdf" }
      );

      const fileUrl = await uploadToCloudinary(pdfFile);
      setGeneratedUrl(fileUrl);

      // 5. Save record to Firestore
      await createInvoice.mutateAsync({
        templateId,
        customerId,
        values: fieldValues,
        lineItems: lineItems.map(li => ({ description: li.desc, quantity: li.qty, price: li.price, total: li.qty * li.price })),
        totals: { subtotal, tax, discount, grandTotal },
        status: "Draft",
        pdfURL: fileUrl
      });

      setStep(4);
      toast({ title: "Invoice Generated successfully!" });
      
    } catch (err) {
      console.error(err);
      toast({ title: "Generation failed", description: "Ensure template is a valid PDF or Image", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingTpls || loadingCusts) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/invoices")} className="text-slate-500 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Invoice</h1>
          <p className="text-slate-500 mt-1">Step {step} of 3</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {step === 1 && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <Label className="text-base">1. Select Template</Label>
              <div className="grid grid-cols-2 gap-4">
                {templates.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => setTemplateId(t.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 flex items-center ${templateId === t.id ? 'border-primary bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-primary/50 bg-white'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${templateId === t.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{t.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{(t.fields || []).length} dynamic fields</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base">2. Select Customer</Label>
              <Select value={customerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50">
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

        {step === 2 && activeTemplate && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6">
              Fill in the dynamic fields defined in <strong>{activeTemplate.name}</strong>.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {activeTemplate.fields.filter(f => !['subtotal', 'tax', 'total', 'grandtotal'].includes(f.name.toLowerCase())).map(field => (
                <div key={field.id} className="space-y-2">
                  <Label>{field.name}</Label>
                  <Input 
                    value={fieldValues[field.name] || ''} 
                    onChange={e => setFieldValues({...fieldValues, [field.name]: e.target.value})}
                    placeholder={`Enter ${field.name}`}
                    className="bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl">Back</Button>
              <Button onClick={() => setStep(3)} className="rounded-xl px-8 shadow-md shadow-primary/20">Next Step</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLineItem} className="rounded-xl h-8">
                  <Plus className="w-4 h-4 mr-1" /> Add Row
                </Button>
              </div>
              
              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <Input placeholder="Description" value={item.desc} onChange={e => updateLineItem(idx, 'desc', e.target.value)} className="bg-white border-slate-200" />
                    </div>
                    <div className="w-24">
                      <Input type="number" placeholder="Qty" value={item.qty || ''} onChange={e => updateLineItem(idx, 'qty', parseFloat(e.target.value)||0)} className="bg-white border-slate-200" />
                    </div>
                    <div className="w-32 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <Input type="number" placeholder="Price" value={item.price || ''} onChange={e => updateLineItem(idx, 'price', parseFloat(e.target.value)||0)} className="bg-white border-slate-200 pl-7" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)} className="text-slate-400 hover:text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Tax (%)</span>
                  <Input type="number" className="w-20 h-8 text-right bg-slate-50 border-slate-200" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value)||0)} />
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 text-sm">Discount ($)</span>
                  <Input type="number" className="w-24 h-8 text-right bg-slate-50 border-slate-200" value={discount} onChange={e => setDiscount(parseFloat(e.target.value)||0)} />
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-slate-900">Total</span>
                  <span className="text-primary">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl">Back</Button>
              <Button onClick={generatePDF} disabled={isGenerating} className="rounded-xl px-8 shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-white font-semibold">
                {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Generate Final PDF
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-16 text-center animate-in zoom-in duration-500 flex flex-col items-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Invoice Generated!</h2>
            <p className="text-slate-500 max-w-md mb-8">Your invoice has been successfully created, saved, and securely uploaded to the cloud.</p>
            
            <div className="flex space-x-4">
              <Button asChild variant="outline" className="rounded-xl h-12 px-6 border-slate-200 shadow-sm">
                <a
                  href={generatedUrl}
                  download={`invoice-${customerId}-${Date.now()}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-5 h-5 mr-2" /> Download PDF
                </a>
              </Button>
              <Button asChild className="rounded-xl h-12 px-6 shadow-md shadow-primary/20">
                <Link href="/invoices">View All Invoices</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
