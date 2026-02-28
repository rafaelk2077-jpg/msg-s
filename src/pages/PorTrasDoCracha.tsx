import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Upload, X, Check, ImagePlus, RefreshCw, Download } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  useCloudinaryUpload,
  validateFile,
  type CloudinaryPhotoMeta,
} from "@/hooks/useCloudinaryUpload";

const MAX_FILES = 5;

const formSchema = z.object({
  nome_cargo: z.string().trim().min(1, "Campo obrigatório").max(200),
  dia_a_dia: z.string().trim().min(1, "Campo obrigatório").max(1000),
  formacao: z.string().trim().min(1, "Campo obrigatório").max(500),
  aprendizado: z.string().trim().min(1, "Campo obrigatório").max(1000),
  conquista: z.string().trim().min(1, "Campo obrigatório").max(1000),
  fora_trabalho: z.string().trim().min(1, "Campo obrigatório").max(1000),
  sonho: z.string().trim().min(1, "Campo obrigatório").max(1000),
});

type FormValues = z.infer<typeof formSchema>;

const questions = [
  { name: "nome_cargo" as const, label: "Qual seu nome e cargo?" },
  { name: "dia_a_dia" as const, label: "O que você faz no dia a dia?" },
  { name: "formacao" as const, label: "Qual sua formação acadêmica?" },
  { name: "aprendizado" as const, label: "Qual é o maior aprendizado que já teve aqui na MSGÁS?" },
  { name: "conquista" as const, label: "Uma conquista de que me orgulho…" },
  { name: "fora_trabalho" as const, label: "Fora do trabalho, o que mais gosta de fazer?" },
  { name: "sonho" as const, label: "Um sonho que ainda quero realizar…" },
];

const CLOUDINARY_CLOUD_NAME = "dh4s7mt6c";

function forceDownloadUrl(publicId: string, format: string) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/fl_attachment/${publicId}.${format}`;
}

const PorTrasDoCracha = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedPhotos, setSubmittedPhotos] = useState<CloudinaryPhotoMeta[]>([]);
  const [profileData, setProfileData] = useState<{ name: string; diretoria: string; gerencia: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    files: photoFiles,
    addFiles,
    removeFile,
    uploadAll,
    retryFile,
    hasErrors,
    isUploading,
  } = useCloudinaryUpload({ preset: "Gásflip", folderPrefix: "gasflip" });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email);
      const { data } = await supabase
        .from("profiles")
        .select("name, diretoria, gerencia")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfileData(data);
    };
    fetchProfile();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_cargo: "",
      dia_a_dia: "",
      formacao: "",
      aprendizado: "",
      conquista: "",
      fora_trabalho: "",
      sonho: "",
    },
  });

  const handleAddPhotos = (fileList: FileList | null) => {
    if (!fileList) return;
    const valid: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      if (photoFiles.length + valid.length >= MAX_FILES) {
        toast({ title: "Limite atingido", description: `Máximo de ${MAX_FILES} fotos`, variant: "destructive" });
        break;
      }
      const err = validateFile(fileList[i]);
      if (err) {
        toast({ title: "Arquivo inválido", description: err, variant: "destructive" });
        continue;
      }
      valid.push(fileList[i]);
    }
    if (valid.length > 0) addFiles(valid);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (values: FormValues) => {
    if (photoFiles.length === 0) {
      toast({ title: "Adicione pelo menos uma foto", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Upload all photos to Cloudinary
      const result = await uploadAll(userEmail);
      if (!result) {
        toast({ title: "Alguns uploads falharam", description: "Corrija os erros e tente novamente.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const insertData = {
        form_type: "por_tras_do_cracha",
        user_id: user?.id ?? null,
        answers: {
          ...values,
          user_email: user?.email || "Anônimo",
          user_name: profileData?.name || user?.email?.split("@")[0] || "Anônimo",
          diretoria: profileData?.diretoria || "N/A",
          gerencia: profileData?.gerencia || "N/A",
          submission_id: result.submissionId,
          photos: result.photos,
        } as unknown as Record<string, never>,
        photo_urls: result.photos.map((p) => p.secure_url),
      };
      const { error } = await supabase.from("form_submissions").insert([insertData]);

      if (error) throw error;

      setSubmittedPhotos(result.photos);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-accent" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Enviado com sucesso!</h2>
            <p className="text-muted-foreground mb-6">Obrigado por compartilhar quem você é por trás do crachá.</p>

            {submittedPhotos.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-sm font-medium">Suas fotos:</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {submittedPhotos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={photo.secure_url}
                        alt={`Foto ${i + 1}`}
                        className="h-20 w-20 rounded-lg object-cover border border-border"
                      />
                      <a
                        href={forceDownloadUrl(photo.public_id, photo.format)}
                        download
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="h-5 w-5 text-white" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => window.history.back()}>Voltar</Button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  const overallProgress =
    photoFiles.length > 0
      ? photoFiles.reduce((sum, f) => sum + f.progress, 0) / photoFiles.length
      : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 md:py-12">
        <div className="container max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2 text-primary">
              Perguntas – Por Trás do Crachá
            </h1>
            <p className="text-muted-foreground mb-8">
              Compartilhe um pouco sobre você! Suas respostas podem ser destaque em nossas publicações.
            </p>
          </motion.div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {questions.map((q) => (
              <div key={q.name} className="space-y-2">
                <Label htmlFor={q.name} className="text-sm font-medium">
                  {q.label} <span className="text-destructive">*</span>
                </Label>
                {q.name === "nome_cargo" || q.name === "formacao" ? (
                  <Input
                    id={q.name}
                    {...form.register(q.name)}
                    className={cn(form.formState.errors[q.name] && "border-destructive")}
                  />
                ) : (
                  <Textarea
                    id={q.name}
                    rows={3}
                    {...form.register(q.name)}
                    className={cn(form.formState.errors[q.name] && "border-destructive")}
                  />
                )}
                {form.formState.errors[q.name] && (
                  <p className="text-sm text-destructive">{form.formState.errors[q.name]?.message}</p>
                )}
              </div>
            ))}

            {/* Photo upload */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Anexar fotos (até {MAX_FILES} · .jpeg, .jpg, .png · máx 10MB cada)
              </Label>
              <div className="flex flex-wrap gap-3">
                {photoFiles.map((pf, i) => (
                  <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border group">
                    <img src={pf.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />

                    {/* Progress overlay */}
                    {pf.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="text-[10px] text-white font-medium">{pf.progress}%</span>
                      </div>
                    )}

                    {/* Done overlay */}
                    {pf.status === "done" && (
                      <div className="absolute top-1 left-1">
                        <Check className="h-4 w-4 text-accent drop-shadow" />
                      </div>
                    )}

                    {/* Error overlay with retry */}
                    {pf.status === "error" && (
                      <div className="absolute inset-0 bg-destructive/60 flex flex-col items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => retryFile(i, userEmail)}
                          className="text-white"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                        <span className="text-[9px] text-white">Tentar de novo</span>
                      </div>
                    )}

                    {/* Remove button (only when not uploading) */}
                    {pf.status !== "uploading" && (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {photoFiles.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px]">Adicionar</span>
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".jpeg,.jpg,.png"
                multiple
                className="hidden"
                onChange={(e) => handleAddPhotos(e.target.files)}
              />

              {/* Upload progress bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Enviando fotos...</span>
                    <span>{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              )}

              {hasErrors && !isUploading && (
                <p className="text-sm text-destructive">
                  Alguns uploads falharam. Clique no ícone de retry nas fotos com erro.
                </p>
              )}
            </div>

            <Button type="submit" disabled={submitting || isUploading} className="w-full" size="lg">
              {submitting || isUploading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {isUploading ? "Enviando fotos..." : "Salvando..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar respostas
                </span>
              )}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PorTrasDoCracha;
