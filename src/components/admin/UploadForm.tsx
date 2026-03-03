import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PUBLICATION_TYPES } from "@/types/publication";
import { UploadProgress, UploadStep } from "@/components/UploadProgress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { generateSlug, formatBytes, withTimeout } from "@/lib/helpers";
import CoverCropper from "./CoverCropper";

interface UploadFormProps {
  onPublished: () => void;
}

interface FormData {
  title: string;
  description: string;
  type: string;
  date: string;
  pdfFile: File | null;
  coverFile: File | null;
  croppedCoverBlob: Blob | null;
}

const INITIAL_FORM: FormData = {
  title: "",
  description: "",
  type: "",
  date: new Date().toISOString().split("T")[0],
  pdfFile: null,
  coverFile: null,
  croppedCoverBlob: null,
};

const UploadForm = ({ onPublished }: UploadFormProps) => {
  const { processAndUpload, processing, progress, cancelProcessing } =
    usePdfProcessor();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawCoverUrl, setRawCoverUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  // Sync PDF processing progress
  useEffect(() => {
    if (processing && progress.percent > 0) {
      const mappedProgress = 35 + progress.percent * 0.55;
      setOverallProgress(mappedProgress);
      setUploadSteps((prev) =>
        prev.map((s) =>
          s.id === "pages"
            ? { ...s, progress: progress.percent, detail: progress.status }
            : s,
        ),
      );
    }
  }, [processing, progress]);

  const ensureUploadableCover = (file: File) => {
    const name = file.name.toLowerCase();
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      name.endsWith(".heic") ||
      name.endsWith(".heif");
    if (isHeic) {
      throw new Error(
        "Formato HEIC/HEIF não suportado no navegador. Converta a imagem para JPG/PNG/WebP e tente novamente.",
      );
    }
  };

  const uploadToStorage = async (
    path: string,
    file: File | Blob,
    timeoutMs: number,
  ) => {
    console.log(`[Upload] Starting: ${path}, size: ${file instanceof File ? file.size : 'blob'}`);

    const uploadPromise = supabase.storage
      .from("publications")
      .upload(path, file, {
        upsert: true,
        contentType: file instanceof File ? (file.type || "application/octet-stream") : "image/webp",
      });

    const { data, error } = await withTimeout(
      uploadPromise,
      timeoutMs,
      `Timeout ao enviar arquivo (${path}). Verifique sua conexão e tente novamente.`,
    );

    if (error) {
      console.error(`[Upload] Error ${path}:`, error);
      throw error;
    }

    console.log(`[Upload] Success: ${path}`);
    return data;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "pdf" | "cover",
  ) => {
    const file = e.target.files?.[0] || null;
    if (type === "cover" && file) {
      // Open cropper
      const url = URL.createObjectURL(file);
      setRawCoverUrl(url);
      setFormData((prev) => ({ ...prev, coverFile: file, croppedCoverBlob: null }));
      setCropperOpen(true);
    } else {
      setFormData((prev) => ({
        ...prev,
        [type === "pdf" ? "pdfFile" : "coverFile"]: file,
      }));
    }
  };

  const handleCropComplete = (blob: Blob) => {
    setFormData((prev) => ({ ...prev, croppedCoverBlob: blob }));
    setCropperOpen(false);
    if (rawCoverUrl) {
      URL.revokeObjectURL(rawCoverUrl);
      setRawCoverUrl(null);
    }
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    if (rawCoverUrl) {
      URL.revokeObjectURL(rawCoverUrl);
      setRawCoverUrl(null);
    }
    // Keep the original file, no crop applied - it will be uploaded as-is
  };

  // Step helpers
  const updateStep = (id: string, updates: Partial<UploadStep>) => {
    setUploadSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const startFakeProgress = (id: string, from: number, to: number) => {
    let value = from;
    setOverallProgress(from);
    updateStep(id, {
      progress: Math.max(0, Math.min(100, ((from - from) / (to - from)) * 100)),
    });
    const interval = window.setInterval(() => {
      value = Math.min(to, value + 1);
      const stepPercent = ((value - from) / (to - from)) * 100;
      setOverallProgress(value);
      updateStep(id, { progress: Math.min(95, stepPercent) });
    }, 200);
    return () => window.clearInterval(interval);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Informe um título para a publicação.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.coverFile) {
      toast({
        title: "Capa obrigatória",
        description: "Selecione uma imagem de capa para a publicação.",
        variant: "destructive",
      });
      return;
    }

    if (formData.type === "Newsletter" && !formData.pdfFile) {
      toast({
        title: "PDF obrigatório para Newsletter",
        description: "Newsletters precisam de um arquivo PDF para exibir o conteúdo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    const steps: UploadStep[] = [
      { id: "cover", label: "Enviando capa", status: "pending" },
    ];
    if (formData.pdfFile) {
      steps.push({ id: "pdf", label: "Enviando PDF", status: "pending" });
      steps.push({
        id: "pages",
        label: "Processando páginas",
        status: "pending",
      });
    }
    steps.push({
      id: "database",
      label: "Salvando no banco de dados",
      status: "pending",
    });

    setUploadSteps(steps);
    setCurrentStepIndex(0);
    setOverallProgress(0);

    const setStepActive = (id: string) => {
      updateStep(id, { status: "active" });
      setCurrentStepIndex(steps.findIndex((s) => s.id === id));
    };
    const setStepComplete = (id: string) =>
      updateStep(id, { status: "completed", progress: 100 });
    const setStepError = (id: string, detail: string) =>
      updateStep(id, { status: "error", detail });

    try {
      const slug = generateSlug(formData.title);
      const year = new Date(formData.date).getFullYear();

      // 1 — Cover
      setStepActive("cover");
      ensureUploadableCover(formData.coverFile);
      const coverBlob = formData.croppedCoverBlob || formData.coverFile;
      const coverSize = coverBlob instanceof File ? coverBlob.size : coverBlob.size;
      updateStep("cover", {
        detail: `${formData.coverFile.name} • ${formatBytes(coverSize)}`,
        progress: 0,
      });
      const stopFakeCover = startFakeProgress("cover", 5, 18);
      const coverExt = formData.croppedCoverBlob ? "webp" : formData.coverFile.name.split(".").pop();
      const coverPath = `covers/${slug}-${Date.now()}.${coverExt}`;
      try {
        await uploadToStorage(coverPath, coverBlob, 90_000);
      } finally {
        stopFakeCover();
      }
      const { data: coverUrlData } = supabase.storage
        .from("publications")
        .getPublicUrl(coverPath);
      setStepComplete("cover");
      setOverallProgress(20);

      // 2 & 3 — PDF + pages
      let pdfUrl: string | null = null;
      let pageUrls: string[] = [];
      let pageCount = 1;

      if (formData.pdfFile) {
        setStepActive("pdf");
        updateStep("pdf", {
          detail: `${formData.pdfFile.name} • ${formatBytes(formData.pdfFile.size)}`,
          progress: 0,
        });
        const stopFakePdf = startFakeProgress("pdf", 25, 33);
        const pdfPath = `pdfs/${slug}-${Date.now()}.pdf`;
        try {
          await uploadToStorage(pdfPath, formData.pdfFile, 180_000);
        } finally {
          stopFakePdf();
        }
        const { data: pdfUrlData } = supabase.storage
          .from("publications")
          .getPublicUrl(pdfPath);
        pdfUrl = pdfUrlData.publicUrl;
        setStepComplete("pdf");
        setOverallProgress(35);

        setStepActive("pages");
        try {
          const result = await processAndUpload(formData.pdfFile, slug);
          pageUrls = result.pageUrls;
          pageCount = result.pageCount;
          setStepComplete("pages");
          setOverallProgress(90);
        } catch (pdfProcessError: any) {
          setStepError(
            "pages",
            pdfProcessError.message || "Erro ao processar páginas",
          );
          toast({
            title: "Aviso",
            description:
              "O PDF foi enviado, mas houve um erro ao processar as páginas. Você pode reprocessar depois.",
            variant: "destructive",
          });
        }
      } else {
        setOverallProgress(50);
      }

      // 4 — Database
      setStepActive("database");
      setOverallProgress(95);

      const { error: insertError } = await supabase
        .from("publications")
        .insert({
          title: formData.title,
          description: formData.description || null,
          type: formData.type || null,
          published_at: formData.date,
          year,
          slug,
          cover_url: coverUrlData.publicUrl,
          pdf_url: pdfUrl,
          page_count: pageCount,
          pages: pageUrls,
          is_a4: true,
        });

      if (insertError) {
        setStepError("database", insertError.message);
        throw insertError;
      }

      setStepComplete("database");
      setOverallProgress(100);

      toast({
        title: "Publicação criada!",
        description: "A publicação foi adicionada com sucesso.",
      });

      setTimeout(() => {
        setFormData(INITIAL_FORM);
        const pdfInput = document.getElementById("pdf") as HTMLInputElement;
        const coverInput = document.getElementById("cover") as HTMLInputElement;
        if (pdfInput) pdfInput.value = "";
        if (coverInput) coverInput.value = "";
        setUploadSteps([]);
        setIsUploading(false);
        onPublished();
      }, 1500);
    } catch (error: any) {
      const activeStep = uploadSteps.find((s) => s.status === "active")?.id;
      if (activeStep)
        setStepError(activeStep, error?.message || "Falha inesperada");

      toast({
        title: "Erro ao criar publicação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Nova Publicação
        </CardTitle>
        <CardDescription>
          Faça upload de um PDF para criar uma nova publicação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          {/* Cover Upload */}
          <div className="space-y-2">
            <Label htmlFor="cover">Imagem de Capa *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${formData.coverFile ? "border-primary bg-primary/5" : "border-border hover:border-accent/50"}`}
            >
              <input
                type="file"
                id="cover"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "cover")}
              />
              <label
                htmlFor="cover"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {formData.coverFile ? (
                  <div className="w-full">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md mb-2">
                      <img
                        src={formData.croppedCoverBlob ? URL.createObjectURL(formData.croppedCoverBlob) : URL.createObjectURL(formData.coverFile)}
                        alt="Preview da capa"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">
                        {formData.coverFile.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const url = URL.createObjectURL(formData.coverFile!);
                          setRawCoverUrl(url);
                          setCropperOpen(true);
                        }}
                      >
                        Recortar
                      </Button>
                    </div>
                    {formData.croppedCoverBlob && (
                      <span className="text-xs text-muted-foreground">✓ Cortada em 4:3</span>
                    )}
                  </div>
                ) : (
                  <>
                    <Image className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Selecionar imagem de capa
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG ou WebP • Será cortada em 4:3
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Newsletter Janeiro 2025"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Breve descrição do conteúdo..."
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Publicação</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {PUBLICATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data de Publicação</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>

          {/* PDF Upload */}
          <div className="space-y-2">
            <Label htmlFor="pdf">Arquivo PDF (opcional)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${formData.pdfFile ? "border-primary bg-primary/5" : "border-border hover:border-accent/50"}`}
            >
              <input
                type="file"
                id="pdf"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e, "pdf")}
              />
              <label
                htmlFor="pdf"
                className="cursor-pointer flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <FileText className="h-4 w-4" />
                {formData.pdfFile ? (
                  <span className="text-primary font-medium">
                    {formData.pdfFile.name}
                  </span>
                ) : (
                  "Anexar PDF para download"
                )}
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && uploadSteps.length > 0 && (
            <div className="space-y-3">
              <UploadProgress
                steps={uploadSteps}
                currentStep={currentStepIndex}
                overallProgress={overallProgress}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  cancelProcessing();
                  setIsUploading(false);
                  setUploadSteps([]);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar Upload
              </Button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isUploading || processing}
          >
            {isUploading || processing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {processing ? "Processando PDF..." : "Enviando..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Publicar
              </>
            )}
          </Button>
        </form>

        {rawCoverUrl && (
          <CoverCropper
            imageSrc={rawCoverUrl}
            open={cropperOpen}
            onClose={handleCropCancel}
            onCropComplete={handleCropComplete}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default UploadForm;
