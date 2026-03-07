import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useTemplate, useCreateTemplate, useUpdateTemplate } from "@/hooks/use-templates";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, MousePointer2, Save, Type, UploadCloud, Hash, AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";
import { Stage, Layer, Rect, Text as KonvaText, Transformer } from "react-konva";
import useImage from 'use-image';
import { v4 as uuidv4 } from 'uuid';
import { TemplateField } from "@shared/schema";
import { Image as KonvaImage } from "react-konva";
import { useToast } from "@/hooks/use-toast";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

// Helper to load image for canvas
const BackgroundImage = ({ url }: { url: string }) => {
  const [image] = useImage(url, 'anonymous');
  if (!image) return null;
  
  // Calculate scale to fit A4 width
  const scale = A4_WIDTH / image.width;
  
  return (
    <Layer>
      <KonvaImage
        image={image}
        x={0}
        y={0}
        width={A4_WIDTH}
        height={image.height * scale}
      />
    </Layer>
  );
};

export default function TemplateEditor() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  
  const { data: existingTemplate, isLoading: loadingTemplate } = useTemplate(id || "");
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const { toast } = useToast();

  const [name, setName] = useState("New Template");
  const [fileURL, setFileURL] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedId, selectShape] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  // Editor View State
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setFileURL(existingTemplate.fileURL);
      setFields(existingTemplate.fields || []);
    }
  }, [existingTemplate]);

  // Handle responsive scaling of the canvas container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const padding = 64;
        const availableWidth = containerRef.current.clientWidth - padding;
        const availableHeight = containerRef.current.clientHeight - padding;
        const scaleW = availableWidth / A4_WIDTH;
        const scaleH = availableHeight / A4_HEIGHT;
        setScale(Math.min(scaleW, scaleH, 1.5)); // Max zoom 1.5x
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    // small delay to ensure layout is done
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, [fileURL]);

  useEffect(() => {
    if (selectedId && trRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, fields]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // For this MVP, we prefer Images. If PDF is uploaded, Cloudinary can sometimes convert it to image via URL transform,
    // but to keep it simple, we'll ask user to upload an image of the template for the editor background.
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);

      let imageUrl = url;

      if (file.type === "application/pdf") {
        imageUrl = url.replace(
          "/upload/",
          "/upload/pg_1,f_jpg/"
        );
      }

      setFileURL(imageUrl);
      if (isNew) setName(file.name.split('.')[0]);
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addField = () => {
    const newField: TemplateField = {
      id: uuidv4(),
      name: `Field_${fields.length + 1}`,
      type: "text",
      x: 100, y: 100,
      width: 150, height: 30,
      fontSize: 12,
      alignment: "left",
      page: 1
    };
    setFields([...fields, newField]);
    selectShape(newField.id);
  };

  const updateSelectedField = (changes: Partial<TemplateField>) => {
    if (!selectedId) return;
    setFields(fields.map(f => f.id === selectedId ? { ...f, ...changes } : f));
  };

  const handleSave = () => {
    if (!fileURL) {
      toast({ title: "Please upload a template background", variant: "destructive" });
      return;
    }
    if (!name) {
      toast({ title: "Please name your template", variant: "destructive" });
      return;
    }

    const payload = { name, fileURL, fields };

    if (isNew) {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Template saved!" });
          setLocation("/templates");
        }
      });
    } else {
      updateMutation.mutate({ id, ...payload }, {
        onSuccess: () => {
          toast({ title: "Template updated!" });
          setLocation("/templates");
        }
      });
    }
  };

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'bg';
    if (clickedOnEmpty) selectShape(null);
  };

  if (!isNew && loadingTemplate) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  const selectedField = fields.find(f => f.id === selectedId);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 z-50">
      {/* Topbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/templates")} className="text-slate-500 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="font-bold text-lg border-transparent hover:border-slate-200 focus:border-primary h-9 w-64 shadow-none bg-transparent"
            placeholder="Template Name"
          />
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setLocation("/templates")} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || uploading} className="rounded-xl shadow-md shadow-primary/20">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Template
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-4 z-10 shrink-0">
          <Button variant="ghost" size="icon" onClick={addField} title="Add Text Field" className="rounded-xl hover:bg-indigo-50 hover:text-primary">
            <Type className="w-5 h-5" />
          </Button>
          <div className="relative group">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-50 hover:text-primary overflow-hidden">
              <UploadCloud className="w-5 h-5" />
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
            </Button>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 overflow-hidden flex items-center justify-center bg-slate-100 relative" ref={containerRef}>
          {!fileURL && !uploading && (
            <div className="text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-200 relative overflow-hidden group">
                <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Upload Background</h2>
              <p className="text-slate-500 mt-1 max-w-xs mx-auto">Upload an image of your invoice layout to start adding dynamic fields.</p>
            </div>
          )}
          {uploading && (
            <div className="flex flex-col items-center text-primary">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="font-medium">Uploading template...</p>
            </div>
          )}
          
          {fileURL && (
            <div 
              className="editor-canvas-container transition-transform duration-200 origin-center"
              style={{ 
                width: A4_WIDTH, 
                height: A4_HEIGHT, 
                transform: `scale(${scale})` 
              }}
            >
              <Stage
                width={A4_WIDTH}
                height={A4_HEIGHT}
                onMouseDown={checkDeselect}
                onTouchStart={checkDeselect}
                ref={stageRef}
              >
                <BackgroundImage url={fileURL} />
                <Layer>
                  {fields.map((field) => {
                    const isSelected = field.id === selectedId;
                    return (
                      <Rect
                        key={field.id}
                        id={field.id}
                        x={field.x}
                        y={field.y}
                        width={field.width}
                        height={field.height}
                        fill={isSelected ? "rgba(79, 70, 229, 0.2)" : "rgba(79, 70, 229, 0.1)"}
                        stroke={isSelected ? "#4f46e5" : "#a5b4fc"}
                        strokeWidth={isSelected ? 2 : 1}
                        draggable
                        onClick={() => selectShape(field.id)}
                        onTap={() => selectShape(field.id)}
                        onDragEnd={(e) => {
                          updateSelectedField({
                            x: e.target.x(),
                            y: e.target.y(),
                          });
                        }}
                        onTransformEnd={(e) => {
                          const node = e.target;
                          const scaleX = node.scaleX();
                          const scaleY = node.scaleY();
                          node.scaleX(1);
                          node.scaleY(1);
                          updateSelectedField({
                            x: node.x(),
                            y: node.y(),
                            width: Math.max(5, node.width() * scaleX),
                            height: Math.max(5, node.height() * scaleY),
                          });
                        }}
                      />
                    );
                  })}
                  {fields.map(field => (
                    <KonvaText
                      key={`text-${field.id}`}
                      x={field.x + 4}
                      y={field.y + 4}
                      text={field.name}
                      fontSize={10}
                      fontFamily="Inter, sans-serif"
                      fill="#4f46e5"
                      listening={false}
                    />
                  ))}
                  {selectedId && (
                    <Transformer
                      ref={trRef}
                      boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) return oldBox;
                        return newBox;
                      }}
                      borderStroke="#4f46e5"
                      anchorStroke="#4f46e5"
                      anchorFill="white"
                      anchorSize={8}
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          )}
        </main>

        {/* Right Properties Panel */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col z-10 shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Properties</h3>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1">
            {!selectedId ? (
              <div className="text-center text-slate-500 mt-10">
                <MousePointer2 className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Select a field on the canvas to edit its properties.</p>
              </div>
            ) : selectedField ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Field Identification</Label>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Field Name</Label>
                    <Input 
                      value={selectedField.name} 
                      onChange={(e) => updateSelectedField({ name: e.target.value })}
                      className="bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Data Type</Label>
                    <Select 
                      value={selectedField.type} 
                      onValueChange={(val: any) => updateSelectedField({ type: val })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="currency">Currency</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Typography & Layout</Label>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Font Size (pt)</Label>
                    <div className="flex items-center relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3" />
                      <Input 
                        type="number" 
                        value={selectedField.fontSize} 
                        onChange={(e) => updateSelectedField({ fontSize: Number(e.target.value) })}
                        className="bg-slate-50 border-slate-200 pl-9 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Alignment</Label>
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                      {(['left', 'center', 'right'] as const).map(align => (
                        <button
                          key={align}
                          className={`flex-1 flex justify-center py-1.5 rounded-lg transition-colors ${selectedField.alignment === align ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-900'}`}
                          onClick={() => updateSelectedField({ alignment: align })}
                        >
                          {align === 'left' ? <AlignLeft className="w-4 h-4" /> : align === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                   <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Position</Label>
                   <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                       <Label className="text-xs text-slate-400">X</Label>
                       <Input type="number" value={Math.round(selectedField.x)} readOnly className="bg-slate-50 text-slate-500" />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs text-slate-400">Y</Label>
                       <Input type="number" value={Math.round(selectedField.y)} readOnly className="bg-slate-50 text-slate-500" />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs text-slate-400">Width</Label>
                       <Input type="number" value={Math.round(selectedField.width)} readOnly className="bg-slate-50 text-slate-500" />
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs text-slate-400">Height</Label>
                       <Input type="number" value={Math.round(selectedField.height)} readOnly className="bg-slate-50 text-slate-500" />
                     </div>
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive hover:bg-destructive hover:text-white border-destructive/20 rounded-xl"
                    onClick={() => {
                      setFields(fields.filter(f => f.id !== selectedId));
                      selectShape(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Field
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
