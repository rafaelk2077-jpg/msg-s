import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus, ImagePlus, X, Check, RefreshCw, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  useCloudinaryUpload,
  validateFile,
} from "@/hooks/useCloudinaryUpload";

const MAX_FILES = 5;

const FEEDBACK_TYPES = [
  { value: "sugestao_pauta", label: "Sugestão de pauta" },
  { value: "reclamacao", label: "Reclamação" },
  { value: "feedback", label: "Feedback" },
] as const;

interface UserInfo {
  name: string;
  email: string;
  diretoria: string;
  gerencia: string;
  userId: string | null;
}

/** Fetch fresh user info from auth session + profiles table. Never cached. */
async function resolveUserInfo(): Promise<UserInfo> {
  const fallback: UserInfo = { name: "Anônimo", email: "Anônimo", diretoria: "N/A", gerencia: "N/A", userId: null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fallback;

  const meta = user.user_metadata ?? {};
  const metaName = (meta.name as string) || user.email?.split("@")[0] || "Anônimo";
  const metaDiretoria = (meta.diretoria as string) || "";
  const metaGerencia = (meta.gerencia as string) || "";

  // Try profiles table for the most up-to-date data
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, diretoria, gerencia")
    .eq("user_id", user.id)
    .maybeSingle();

  const pick = (profileVal?: string, metaVal?: string) => {
    if (profileVal && profileVal !== "N/A") return profileVal;
    if (metaVal && metaVal !== "N/A") return metaVal;
    return "N/A";
  };

  return {
    userId: user.id,
    email: user.email || "Anônimo",
    name: profile?.name || metaName,
    diretoria: pick(profile?.diretoria, metaDiretoria),
    gerencia: pick(profile?.gerencia, metaGerencia),
  };
}

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackDialog = ({ open, onOpenChange }: FeedbackDialogProps) => {
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    files: mediaFiles,
    addFiles,
    removeFile,
    uploadAll,
    retryFile,
    reset: resetFiles,
    hasErrors,
    isUploading,
  } = useCloudinaryUpload({
    preset: "feedbacks",
    allowVideo: true,
    maxFiles: MAX_FILES,
    folderPrefix: "feedbacks",
  });

  // Always fetch fresh data when dialog opens
  const handleOpenChange = useCallback(async (val: boolean) => {
    if (val) {
      const info = await resolveUserInfo();
      setUserInfo(info);
    } else {
      resetFiles();
      setUserInfo(null);
    }
    onOpenChange(val);
  }, [onOpenChange, resetFiles]);

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const valid: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      if (mediaFiles.length + valid.length >= MAX_FILES) {
        toast({ title: "Limite atingido", description: `Máximo de ${MAX_FILES} arquivos`, variant: "destructive" });
        break;
      }
      const err = validateFile(fileList[i], true);
      if (err) {
        toast({ title: "Arquivo inválido", description: err, variant: "destructive" });
        continue;
      }
      valid.push(fileList[i]);
    }
    if (valid.length > 0) addFiles(valid);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!type || !message.trim()) {
      toast({ title: "Preencha todos os campos", description: "Selecione o tipo e escreva sua mensagem.", variant: "destructive" });
      return;
    }
    if (message.trim().length > 2000) {
      toast({ title: "Mensagem muito longa", description: "A mensagem deve ter no máximo 2000 caracteres.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Re-resolve user info at submit time for absolute freshness
      const info = await resolveUserInfo();

      let uploadedMedia: { secure_url: string; public_id: string; resource_type?: string }[] = [];
      if (mediaFiles.length > 0) {
        const result = await uploadAll(info.email);
        if (!result) {
          toast({ title: "Alguns uploads falharam", description: "Corrija os erros e tente novamente.", variant: "destructive" });
          setSending(false);
          return;
        }
        uploadedMedia = result.photos;
      }

      const typeLabel = FEEDBACK_TYPES.find((t) => t.value === type)?.label || type;

      const { error } = await supabase.from("form_submissions").insert({
        form_type: "feedback",
        user_id: info.userId,
        answers: {
          type: typeLabel,
          message: message.trim(),
          user_email: info.email,
          user_name: info.name,
          diretoria: info.diretoria,
          gerencia: info.gerencia,
          ...(uploadedMedia.length > 0 && { media: uploadedMedia }),
        },
        photo_urls: uploadedMedia.map((m) => m.secure_url),
      });

      if (error) throw error;

      toast({ title: "Enviado com sucesso!", description: "Obrigado pelo seu feedback." });
      setType("");
      setMessage("");
      resetFiles();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const overallProgress =
    mediaFiles.length > 0
      ? mediaFiles.reduce((sum, f) => sum + f.progress, 0) / mediaFiles.length
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          Enviar Feedback
        </DialogTitle>
        <DialogDescription>
          Sua opinião é importante para melhorarmos a comunicação interna.
        </DialogDescription>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="feedback-type">
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Mensagem</Label>
            <Textarea
              id="feedback-message"
              placeholder="Escreva sua mensagem aqui..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>

          {/* Media upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Anexar fotos ou vídeos <span className="text-muted-foreground font-normal">(opcional · até {MAX_FILES} · máx 10MB cada)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {mediaFiles.map((pf, i) => (
                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border group">
                  {pf.isVideo ? (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ) : (
                    <img src={pf.preview} alt={`Arquivo ${i + 1}`} className="h-full w-full object-cover" />
                  )}
                  {pf.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-0.5">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span className="text-[9px] text-white font-medium">{pf.progress}%</span>
                    </div>
                  )}
                  {pf.status === "done" && (
                    <div className="absolute top-0.5 left-0.5">
                      <Check className="h-3 w-3 text-accent drop-shadow" />
                    </div>
                  )}
                  {pf.status === "error" && (
                    <div className="absolute inset-0 bg-destructive/60 flex flex-col items-center justify-center">
                      <button type="button" onClick={() => retryFile(i, userInfo?.email)} className="text-white">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {pf.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
              {mediaFiles.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="text-[9px]">Adicionar</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".jpeg,.jpg,.png,.mp4,.mov,.webm"
              multiple
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />
            {isUploading && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enviando arquivos...</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
              </div>
            )}
            {hasErrors && !isUploading && (
              <p className="text-xs text-destructive">
                Alguns uploads falharam. Clique no ícone de retry.
              </p>
            )}
          </div>

          {userInfo && userInfo.userId && (
            <div className="text-xs text-muted-foreground rounded-md bg-secondary/50 p-3 space-y-0.5">
              <p><strong>Nome:</strong> {userInfo.name}</p>
              <p><strong>Email:</strong> {userInfo.email}</p>
              <p><strong>Setor:</strong> {userInfo.diretoria} / {userInfo.gerencia}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={sending || isUploading}
            className="w-full"
          >
            {sending || isUploading ? (isUploading ? "Enviando arquivos..." : "Enviando...") : "Enviar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
