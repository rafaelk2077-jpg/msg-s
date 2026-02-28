import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicationRow } from "@/types/publication";
import { toast } from "@/hooks/use-toast";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";

export function usePublicationActions(refetch: () => Promise<void>) {
  const { processAndUpload, processing, progress, cancelProcessing } =
    usePdfProcessor();

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("publications")
          .delete()
          .eq("id", id);
        if (error) throw error;

        toast({
          title: "Publicação removida",
          description: "A publicação foi excluída com sucesso.",
        });
        await refetch();
      } catch (error: any) {
        toast({
          title: "Erro ao excluir",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [refetch],
  );

  const handleDuplicate = useCallback(
    async (pub: PublicationRow) => {
      try {
        const newSlug = `${pub.slug}-copia-${Date.now()}`;
        
        let pages = pub.pages;
        let pageCount = pub.page_count;

        // If original has no pages but has a PDF, reprocess it
        if (pub.pdf_url && (!pub.pages || pub.pages.length === 0)) {
          try {
            toast({
              title: "Processando PDF...",
              description: "Extraindo páginas do PDF para a cópia.",
            });
            const response = await fetch(pub.pdf_url);
            const blob = await response.blob();
            const file = new File([blob], `${newSlug}.pdf`, { type: "application/pdf" });
            const result = await processAndUpload(file, newSlug);
            pages = result.pageUrls;
            pageCount = result.pageCount;
          } catch (err) {
            console.warn("[Duplicate] Failed to reprocess PDF, duplicating without pages:", err);
          }
        }

        const { error } = await supabase.from("publications").insert({
          title: `${pub.title} (Cópia)`,
          description: pub.description,
          theme: pub.theme,
          type: pub.type,
          published_at: pub.published_at,
          year: pub.year,
          slug: newSlug,
          cover_url: pub.cover_url,
          pdf_url: pub.pdf_url,
          page_count: pageCount,
          pages: pages,
          is_a4: pub.is_a4,
        });

        if (error) throw error;

        toast({
          title: "Publicação duplicada!",
          description: "A cópia foi criada com sucesso.",
        });
        await refetch();
      } catch (error: any) {
        toast({
          title: "Erro ao duplicar",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [refetch, processAndUpload],
  );

  const handleReprocessPdf = useCallback(
    async (pub: PublicationRow) => {
      if (!pub.pdf_url) return;

      try {
        const response = await fetch(pub.pdf_url);
        const blob = await response.blob();
        const file = new File([blob], `${pub.slug}.pdf`, {
          type: "application/pdf",
        });

        const result = await processAndUpload(file, pub.slug);

        const { error } = await supabase
          .from("publications")
          .update({
            pages: result.pageUrls,
            page_count: result.pageCount,
          })
          .eq("id", pub.id);

        if (error) throw error;

        toast({
          title: "PDF reprocessado!",
          description: `${result.pageCount} páginas extraídas com sucesso.`,
        });
        await refetch();
      } catch (error: any) {
        toast({
          title: "Erro ao reprocessar",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [refetch, processAndUpload],
  );

  return {
    handleDelete,
    handleDuplicate,
    handleReprocessPdf,
    processing,
    progress,
    cancelProcessing,
  };
}
