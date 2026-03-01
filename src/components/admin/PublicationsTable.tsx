import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toPng } from "html-to-image";
import {
  Calendar, Eye, Trash2, Copy, RefreshCw, Pencil, ChevronDown, ChevronRight, Mail, Image, Star, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PublicationRow } from "@/types/publication";
import EditPublicationDialog from "./EditPublicationDialog";
import PublicationReadStats from "./PublicationReadStats";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoMsgas from "@/assets/Logo-principal.svg";

const PUBLISHED_BASE_URL = "https://ms-gazeta.lovable.app";

interface PublicationsTableProps {
  publications: PublicationRow[];
  processing: boolean;
  onDelete: (id: string) => void;
  onDuplicate: (pub: PublicationRow) => void;
  onReprocess: (pub: PublicationRow) => void;
  onRefresh: () => void;
}

const PublicationsTable = ({
  publications,
  processing,
  onDelete,
  onDuplicate,
  onReprocess,
  onRefresh,
}: PublicationsTableProps) => {
  const [editingPub, setEditingPub] = useState<PublicationRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewPub, setPreviewPub] = useState<PublicationRow | null>(null);
  const inviteRef = useRef<HTMLDivElement>(null);
  const [avgRatings, setAvgRatings] = useState<Record<string, { avg: number; count: number }>>({});

  useEffect(() => {
    const fetchRatings = async () => {
      const { data } = await supabase
        .from("publication_ratings")
        .select("publication_id, rating") as any;
      if (!data) return;
      const map: Record<string, { sum: number; count: number }> = {};
      for (const r of data) {
        if (!map[r.publication_id]) map[r.publication_id] = { sum: 0, count: 0 };
        map[r.publication_id].sum += r.rating;
        map[r.publication_id].count += 1;
      }
      const result: Record<string, { avg: number; count: number }> = {};
      for (const [id, v] of Object.entries(map)) {
        result[id] = { avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count };
      }
      setAvgRatings(result);
    };
    fetchRatings();
  }, [publications]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const buildEmailHtml = (pub: PublicationRow) => {
    const readUrl = `${PUBLISHED_BASE_URL}/leitura/${pub.slug}`;
    return `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
  <tr>
    <td style="background:#1e3a5f;padding:20px 28px;text-align:center;">
      <img src="${PUBLISHED_BASE_URL}/logo-msgazeta.svg" alt="MSGás" height="36" style="display:block;margin:0 auto;height:36px;width:auto;" />
    </td>
  </tr>
  <tr>
    <td style="padding:0;">
      <a href="${readUrl}" target="_blank" style="text-decoration:none;">
        <img src="${pub.cover_url}" alt="${pub.title}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
      </a>
    </td>
  </tr>
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:28px;">
      <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;font-weight:600;text-align:left;">Edição fresquinha no ar 🔥</p>
      <h2 style="margin:0 0 10px;font-size:26px;color:#ffffff;line-height:1.3;font-weight:800;">${pub.title}</h2>
      ${pub.description ? `<p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.85);line-height:1.6;">${pub.description}</p>` : ""}
      ${pub.theme ? `<span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:11px;color:#ffffff;">${pub.theme}</span>` : ""}
    </td>
  </tr>
  <tr>
    <td align="center" style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:24px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
          <td align="center" valign="middle" style="background:#ffffff;border-radius:8px;text-align:center;width:260px;height:48px;">
            <a href="${readUrl}" target="_blank" style="display:inline-block;width:260px;line-height:48px;color:#1e3a5f;text-decoration:none;font-size:15px;font-weight:800;letter-spacing:0.3px;">Clique aqui e confira</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#0f2a45;padding:16px 28px;text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);">Comunicação Interna MSGás • Não guarde só pra você, compartilhe! 💛</p>
    </td>
  </tr>
</table>`;
  };

  const handleCopyEmailHtml = (pub: PublicationRow) => {
    const html = buildEmailHtml(pub);
    navigator.clipboard.writeText(html).then(() => {
      toast({ title: "HTML copiado!", description: "Cole o snippet na sua ferramenta de email marketing." });
    }).catch(() => {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<pre style="white-space:pre-wrap;word-break:break-all;">${html.replace(/</g, "&lt;")}</pre>`);
      }
    });
  };

  const handleDownloadImage = useCallback(async () => {
    if (!inviteRef.current) return;
    try {
      const dataUrl = await toPng(inviteRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `convite-${previewPub?.slug || "publicacao"}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Imagem gerada!", description: "Envie pelo WhatsApp ou onde preferir." });
    } catch {
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
    }
  }, [previewPub]);

  const renderActions = (pub: PublicationRow) => (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPub(pub)} title="Editar publicação">
        <Pencil className="h-4 w-4" />
      </Button>
      {pub.pdf_url && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onReprocess(pub)} disabled={processing} title="Reprocessar PDF">
          <RefreshCw className={`h-4 w-4 ${processing ? "animate-spin" : ""}`} />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link to={`/leitura/${pub.slug}`}><Eye className="h-4 w-4" /></Link>
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyEmailHtml(pub)} title="Copiar HTML para email">
        <Mail className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewPub(pub)} title="Gerar imagem para WhatsApp">
        <Image className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(pub)} title="Duplicar publicação">
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
        const url = `${PUBLISHED_BASE_URL}/leitura/${pub.slug}`;
        navigator.clipboard.writeText(url).then(() => {
          toast({ title: "Link copiado!", description: url });
        });
      }} title="Copiar link da publicação">
        <Link2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(pub.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {publications.map((pub) => (
          <div key={pub.id}>
            <div
              className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpand(pub.id)}
            >
              <img src={pub.cover_url} alt={pub.title} className="h-16 w-12 rounded object-cover shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-sm line-clamp-1">{pub.title}</p>
                <div className="flex flex-wrap items-center gap-1">
                  {pub.type && <Badge variant="outline" className="text-[10px]">{pub.type}</Badge>}
                  {pub.theme && <Badge variant="secondary" className="text-[10px] max-w-[120px] truncate">{pub.theme}</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(pub.published_at), "dd/MM/yy", { locale: ptBR })}
                  </span>
                  <span>{pub.page_count}p</span>
                  {avgRatings[pub.id] && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {avgRatings[pub.id].avg}
                    </span>
                  )}
                </div>
                {renderActions(pub)}
              </div>
              <div className="shrink-0 self-center">
                {expandedId === pub.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
            {expandedId === pub.id && (
              <div className="mt-1 p-3 rounded-lg bg-muted/30 border border-border">
                <PublicationReadStats publicationId={pub.id} publicationTitle={pub.title} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="overflow-x-auto hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Publicação</TableHead>
              <TableHead>Tema</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Páginas</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publications.map((pub) => (
              <>
                <TableRow key={pub.id} className="cursor-pointer" onClick={() => toggleExpand(pub.id)}>
                  <TableCell className="w-8 px-2">
                    {expandedId === pub.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={pub.cover_url} alt={pub.title} className="h-12 w-16 rounded object-cover" />
                      <div>
                        <p className="font-medium line-clamp-1">{pub.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {pub.type && <Badge variant="outline" className="mr-1 text-[10px]">{pub.type}</Badge>}
                          {pub.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {pub.theme && <Badge variant="outline">{pub.theme}</Badge>}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(pub.published_at), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  </TableCell>
                  <TableCell>{pub.page_count}</TableCell>
                  <TableCell>
                    {avgRatings[pub.id] ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {avgRatings[pub.id].avg}
                        <span className="text-xs text-muted-foreground">({avgRatings[pub.id].count})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {renderActions(pub)}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedId === pub.id && (
                  <TableRow key={`${pub.id}-stats`}>
                    <TableCell colSpan={7} className="bg-muted/30 px-6 py-4">
                      <PublicationReadStats publicationId={pub.id} publicationTitle={pub.title} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditPublicationDialog
        publication={editingPub}
        open={!!editingPub}
        onOpenChange={(open) => { if (!open) setEditingPub(null); }}
        onSaved={onRefresh}
      />

      <Dialog open={!!previewPub} onOpenChange={(open) => { if (!open) setPreviewPub(null); }}>
        <DialogContent className="max-w-[660px]">
          <DialogHeader>
            <DialogTitle>Convite para leitura</DialogTitle>
            <DialogDescription>Baixe como imagem para enviar pelo WhatsApp ou copie o HTML para email.</DialogDescription>
          </DialogHeader>

          {previewPub && (
            <>
              <div
                ref={inviteRef}
                style={{
                  maxWidth: 600,
                  margin: "0 auto",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                }}
              >
                <div style={{ background: "#1e3a5f", padding: "20px 28px", textAlign: "center" }}>
                  <img
                    src={logoMsgas}
                    alt="MSGás"
                    crossOrigin="anonymous"
                    style={{ height: 36, width: "auto" }}
                  />
                </div>
                <img
                  src={previewPub.cover_url}
                  alt={previewPub.title}
                  crossOrigin="anonymous"
                  style={{ width: "100%", display: "block" }}
                />
                <div
                  style={{
                    background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)",
                    padding: "28px 28px 12px",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>
                    Edição fresquinha no ar 🔥
                  </p>
                  <h2 style={{ margin: "0 0 10px", fontSize: 26, color: "#ffffff", lineHeight: 1.3, fontWeight: 800 }}>
                    {previewPub.title}
                  </h2>
                  {previewPub.description && (
                    <p style={{ margin: "0 0 14px", fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                      {previewPub.description}
                    </p>
                  )}
                  {previewPub.theme && (
                    <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(255,255,255,0.15)", borderRadius: 20, fontSize: 11, color: "#ffffff" }}>
                      {previewPub.theme}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)",
                    padding: "16px 28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 56,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 18, color: "#ffffff", fontWeight: 800, textAlign: "left" }}>
                    Clique no link abaixo e confira!
                  </p>
                </div>
                <div style={{ background: "#0f2a45", padding: "14px 28px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    Comunicação Interna MSGás • Não guarde só pra você, compartilhe! 💛
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => handleCopyEmailHtml(previewPub)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Copiar HTML
                </Button>
                <Button onClick={handleDownloadImage}>
                  <Image className="h-4 w-4 mr-2" />
                  Baixar imagem
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PublicationsTable;
