import { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PUBLICATION_TYPES, PublicationRow } from "@/types/publication";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";

interface EditPublicationDialogProps {
  publication: PublicationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EditPublicationDialog = ({
  publication,
  open,
  onOpenChange,
  onSaved,
}: EditPublicationDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [pages, setPages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingPages, setAddingPages] = useState(false);
  const { processAndUpload } = usePdfProcessor();

  const pubId = publication?.id;
  useEffect(() => {
    if (publication && pubId) {
      setTitle(publication.title);
      setDescription(publication.description || "");
      setType(publication.type || "");
      setPages([...publication.pages]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubId]);

  if (!publication) return null;

  const handleRemovePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= pages.length - 1) return;
    setPages((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAddingPages(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "webp";
        const path = `pages/${publication.slug}/page-added-${Date.now()}-${i}.${ext}`;

        const { error } = await supabase.storage
          .from("publications")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (error) throw error;

        const { data } = supabase.storage.from("publications").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      setPages((prev) => [...prev, ...newUrls]);
      toast({ title: `${newUrls.length} página(s) adicionada(s)` });
    } catch (err: any) {
      toast({ title: "Erro ao adicionar páginas", description: err.message, variant: "destructive" });
    } finally {
      setAddingPages(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleAddPdfPages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAddingPages(true);
    try {
      const result = await processAndUpload(file, `${publication.slug}-add-${Date.now()}`);
      setPages((prev) => [...prev, ...result.pageUrls]);
      toast({ title: `${result.pageCount} página(s) extraídas e adicionadas` });
    } catch (err: any) {
      toast({ title: "Erro ao processar PDF", description: err.message, variant: "destructive" });
    } finally {
      setAddingPages(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("publications")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          type: type || null,
          pages,
          page_count: pages.length || 1,
        })
        .eq("id", publication.id);

      if (error) throw error;

      toast({ title: "Publicação atualizada!" });
      onOpenChange(false);
      if (typeof onSaved === "function") onSaved();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogTitle>Editar Publicação</DialogTitle>
        <DialogDescription>
          Edite os dados e gerencie as páginas da publicação.
        </DialogDescription>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PUBLICATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pages management */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Páginas ({pages.length})</Label>
                <div className="flex gap-2">
                  <div>
                    <input
                      type="file"
                      id="add-images"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAddImages}
                      disabled={addingPages}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("add-images")?.click()}
                      disabled={addingPages}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Imagens
                    </Button>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="add-pdf-pages"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleAddPdfPages}
                      disabled={addingPages}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("add-pdf-pages")?.click()}
                      disabled={addingPages}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>

              {addingPages && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando páginas...
                </div>
              )}

              {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma página. Adicione imagens ou um PDF.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-auto rounded-md border p-2">
                  {pages.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="flex items-center gap-2 rounded-md border bg-card p-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index >= pages.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                        >
                          ▼
                        </button>
                      </div>
                      <img
                        src={url}
                        alt={`Página ${index + 1}`}
                        className="h-16 w-12 rounded object-cover border"
                      />
                      <span className="text-sm text-muted-foreground flex-1">
                        Página {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemovePage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPublicationDialog;
