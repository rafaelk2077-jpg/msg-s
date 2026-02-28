import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, CheckCircle2, Circle, FileText, Archive, ArchiveRestore, Eye } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "@/hooks/use-toast";

interface Submission {
  id: string;
  form_type: string;
  answers: Record<string, any>;
  created_at: string;
  user_id: string | null;
  photo_urls: string[];
  reviewed: boolean;
  admin_notes: string | null;
  archived?: boolean;
}

const FeedbackView = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleToggleReviewed = async (s: Submission) => {
    const newVal = !s.reviewed;
    const { error } = await supabase
      .from("form_submissions")
      .update({ reviewed: newVal })
      .eq("id", s.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setSubmissions((prev) => prev.map((item) => item.id === s.id ? { ...item, reviewed: newVal } : item));
  };

  const handleToggleArchived = async (s: Submission) => {
    const newVal = !s.archived;
    const { error } = await supabase
      .from("form_submissions")
      .update({ archived: newVal } as any)
      .eq("id", s.id);
    if (error) {
      toast({ title: "Erro ao arquivar", description: error.message, variant: "destructive" });
      return;
    }
    setSubmissions((prev) => prev.map((item) => item.id === s.id ? { ...item, archived: newVal } : item));
    toast({ title: newVal ? "Feedback arquivado" : "Feedback restaurado" });
  };

  const handleUpdateSubmission = (updated: Submission) => {
    setSubmissions((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("form_type", "feedback")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error && data) setSubmissions(data as Submission[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredSubmissions = submissions.filter((s) => showArchived ? s.archived : !s.archived);
  const archivedCount = submissions.filter((s) => s.archived).length;
  const activeCount = submissions.filter((s) => !s.archived).length;

  const handleExport = () => {
    const rows = filteredSubmissions.map((s) => ({
      Nome: s.answers.user_name || "",
      Email: s.answers.user_email || "",
      Diretoria: s.answers.diretoria || "",
      Gerência: s.answers.gerencia || "",
      Mensagem: s.answers.message || "",
      Data: new Date(s.created_at).toLocaleDateString("pt-BR"),
    }));
    exportToCsv("feedbacks.csv", rows);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedbacks, Reclamações e Sugestões
            </CardTitle>
            <CardDescription>
              {activeCount} ativo(s) • {archivedCount} arquivado(s)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? <Eye className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
              {showArchived ? "Ver ativos" : `Arquivados (${archivedCount})`}
            </Button>
            {filteredSubmissions.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSubmissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {showArchived ? "Nenhum feedback arquivado." : "Nenhum feedback recebido ainda."}
          </p>
        ) : (
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(s)}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleReviewed(s)}
                        title={s.reviewed ? "Marcado como verificado" : "Marcar como verificado"}
                      >
                        {s.reviewed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.answers.user_name || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.answers.user_email || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.answers.diretoria} / {s.answers.gerencia}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {s.answers.message || "—"}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleArchived(s)}
                        title={s.archived ? "Restaurar" : "Arquivar"}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {s.archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <SubmissionDetailDialog
          selected={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdateSubmission}
          onArchive={handleToggleArchived}
        />
      </CardContent>
    </Card>
  );
};

const CrachaView = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);

  const handleToggleReviewed = async (s: Submission) => {
    const newVal = !s.reviewed;
    const { error } = await supabase
      .from("form_submissions")
      .update({ reviewed: newVal })
      .eq("id", s.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setSubmissions((prev) => prev.map((item) => item.id === s.id ? { ...item, reviewed: newVal } : item));
  };

  const handleUpdateSubmission = (updated: Submission) => {
    setSubmissions((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .neq("form_type", "feedback")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error && data) setSubmissions(data as Submission[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleExport = () => {
    const rows = submissions.map((s) => {
      const base: Record<string, any> = {
        Nome: s.answers.user_name || s.answers.nome_cargo || "",
        Email: s.answers.user_email || "",
        Diretoria: s.answers.diretoria || "",
        Gerência: s.answers.gerencia || "",
        Data: new Date(s.created_at).toLocaleDateString("pt-BR"),
      };
      // Flatten form-specific answers (exclude user metadata already shown)
      const metaKeys = ["user_name", "user_email", "diretoria", "gerencia"];
      Object.entries(s.answers).forEach(([key, val]) => {
        if (!metaKeys.includes(key)) {
          base[key] = typeof val === "string" ? val : JSON.stringify(val);
        }
      });
      return base;
    });
    exportToCsv("por-tras-do-cracha.csv", rows);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Por Trás do Crachá
            </CardTitle>
            <CardDescription>
              {submissions.length} envio(s) registrado(s)
            </CardDescription>
          </div>
          {submissions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum envio do "Por Trás do Crachá" ainda.
          </p>
        ) : (
          <div className="rounded-md border max-h-96 overflow-auto">
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome / Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(s)}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleReviewed(s)}
                        title={s.reviewed ? "Marcado como verificado" : "Marcar como verificado"}
                      >
                        {s.reviewed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.answers.nome_cargo || s.answers.user_name || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.answers.user_email || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.answers.diretoria && s.answers.gerencia
                        ? `${s.answers.diretoria} / ${s.answers.gerencia}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <SubmissionDetailDialog selected={selected} onClose={() => setSelected(null)} onUpdate={handleUpdateSubmission} />
      </CardContent>
    </Card>
  );
};

function SubmissionDetailDialog({
  selected,
  onClose,
  onUpdate,
  onArchive,
}: {
  selected: Submission | null;
  onClose: () => void;
  onUpdate?: (updated: Submission) => void;
  onArchive?: (s: Submission) => void;
}) {
  const [notes, setNotes] = useState(selected?.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [expandedImg, setExpandedImg] = useState<string | null>(null);

  // Sync notes when selected changes
  useEffect(() => {
    setNotes(selected?.admin_notes || "");
  }, [selected?.id, selected?.admin_notes]);

  const handleDownloadTxt = () => {
    if (!selected) return;
    const lines: string[] = [];
    lines.push(`Formulário: ${selected.form_type}`);
    lines.push(`Data: ${new Date(selected.created_at).toLocaleString("pt-BR")}`);
    lines.push(`Status: ${selected.reviewed ? "Verificado" : "Pendente"}`);
    lines.push("");
    Object.entries(selected.answers).forEach(([key, value]) => {
      const label = key.replace(/_/g, " ").toUpperCase();
      const val = typeof value === "string" ? value : JSON.stringify(value, null, 2);
      lines.push(`${label}:`);
      lines.push(val);
      lines.push("");
    });
    if (selected.photo_urls?.length) {
      lines.push("FOTOS/ANEXOS:");
      selected.photo_urls.forEach((url, i) => lines.push(`  ${i + 1}. ${url}`));
      lines.push("");
    }
    if (selected.admin_notes) {
      lines.push("COMENTÁRIO DO ADMINISTRADOR:");
      lines.push(selected.admin_notes);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissao-${selected.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("form_submissions")
      .update({ admin_notes: notes.trim() || null })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Comentário salvo" });
    onUpdate?.({ ...selected, admin_notes: notes.trim() || null });
  };

  const handleToggleReviewed = async () => {
    if (!selected) return;
    const newVal = !selected.reviewed;
    const { error } = await supabase
      .from("form_submissions")
      .update({ reviewed: newVal })
      .eq("id", selected.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    onUpdate?.({ ...selected, reviewed: newVal });
  };

  return (
    <>
      <Dialog open={!!selected} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-between">
            <DialogTitle>Detalhes do envio</DialogTitle>
            <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
              <FileText className="h-4 w-4 mr-1" />
              Baixar TXT
            </Button>
          </div>
          <DialogDescription>
            Enviado em{" "}
            {selected && new Date(selected.created_at).toLocaleString("pt-BR")}
          </DialogDescription>
          {selected && (
            <div className="space-y-3 mt-2">
              {/* Reviewed toggle & Archive */}
              <div className="flex items-center gap-4">
                <button onClick={handleToggleReviewed} className="flex items-center gap-2 text-sm">
                  {selected.reviewed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                  {selected.reviewed ? "Verificado" : "Marcar como verificado"}
                </button>
                {onArchive && (
                  <button onClick={() => onArchive(selected)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {selected.archived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {selected.archived ? "Restaurar" : "Arquivar"}
                  </button>
                )}
              </div>

              {Object.entries(selected.answers).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {typeof value === "string"
                      ? value
                      : JSON.stringify(value, null, 2)}
                  </p>
                </div>
              ))}
              {selected.photo_urls && selected.photo_urls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Fotos
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.photo_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="rounded-md w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setExpandedImg(url)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Admin notes */}
              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Comentário do administrador
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione um comentário interno..."
                  rows={3}
                />
                <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar comentário"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image lightbox */}
      <Dialog open={!!expandedImg} onOpenChange={() => setExpandedImg(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] p-2 flex items-center justify-center bg-black/90 border-none">
          <DialogTitle className="sr-only">Imagem expandida</DialogTitle>
          <DialogDescription className="sr-only">Visualização da imagem em tamanho completo</DialogDescription>
          {expandedImg && (
            <img
              src={expandedImg}
              alt="Imagem expandida"
              className="max-w-full max-h-[90vh] object-contain rounded-md"
              onClick={() => setExpandedImg(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export { FeedbackView, CrachaView };
export default FeedbackView;
