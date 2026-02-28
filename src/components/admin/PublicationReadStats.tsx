import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Users, Star, MessageSquare } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReadEntry {
  user_id: string;
  user_name: string;
  diretoria: string;
  gerencia: string;
  read_at: string;
  completed: boolean;
  rating?: number;
  feedback?: string;
}

interface Props {
  publicationId: string;
  publicationTitle: string;
}

const PublicationReadStats = ({ publicationId, publicationTitle }: Props) => {
  const [reads, setReads] = useState<ReadEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [readsRes, ratingsRes] = await Promise.all([
          supabase
            .from("publication_reads")
            .select("user_id, read_at, completed")
            .eq("publication_id", publicationId)
            .order("read_at", { ascending: false }),
          supabase
            .from("publication_ratings")
            .select("user_id, rating, feedback")
            .eq("publication_id", publicationId),
        ]);

        if (readsRes.error) throw readsRes.error;
        const readsData = readsRes.data || [];
        const ratingsData = ratingsRes.data || [];

        if (readsData.length === 0 && ratingsData.length === 0) {
          setReads([]);
          setLoading(false);
          return;
        }

        // Merge user IDs from both reads and ratings
        const allUserIds = [...new Set([
          ...readsData.map((r) => r.user_id),
          ...ratingsData.map((r) => r.user_id),
        ])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, diretoria, gerencia")
          .in("user_id", allUserIds);

        const profilesMap = new Map(
          (profiles || []).map((p) => [p.user_id, p])
        );
        const ratingsMap = new Map(
          ratingsData.map((r) => [r.user_id, r])
        );

        // Build entries from reads, enriched with ratings
        const readEntries: ReadEntry[] = readsData.map((r) => {
          const profile = profilesMap.get(r.user_id);
          const ratingEntry = ratingsMap.get(r.user_id);
          return {
            user_id: r.user_id,
            user_name: profile?.name || "Desconhecido",
            diretoria: profile?.diretoria || "N/A",
            gerencia: profile?.gerencia || "N/A",
            read_at: r.read_at,
            completed: r.completed,
            rating: ratingEntry?.rating,
            feedback: ratingEntry?.feedback ?? undefined,
          };
        });

        // Add ratings from users who rated but didn't trigger a read entry
        const readUserIds = new Set(readsData.map((r) => r.user_id));
        for (const rat of ratingsData) {
          if (!readUserIds.has(rat.user_id)) {
            const profile = profilesMap.get(rat.user_id);
            readEntries.push({
              user_id: rat.user_id,
              user_name: profile?.name || "Desconhecido",
              diretoria: profile?.diretoria || "N/A",
              gerencia: profile?.gerencia || "N/A",
              read_at: "",
              completed: false,
              rating: rat.rating,
              feedback: rat.feedback ?? undefined,
            });
          }
        }

        setReads(readEntries);
      } catch (err) {
        console.error("Error fetching read stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [publicationId]);

  const handleExport = () => {
    const rows = reads.map((r) => ({
      Nome: r.user_name,
      Diretoria: r.diretoria,
      Gerência: r.gerencia,
      Data: r.read_at ? new Date(r.read_at).toLocaleDateString("pt-BR") : "—",
      Concluída: r.completed ? "Sim" : "Não",
      Nota: r.rating ?? "",
      Feedback: r.feedback ?? "",
    }));
    exportToCsv(`leituras-${publicationTitle.slice(0, 30)}.csv`, rows);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (reads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma leitura registrada.
      </p>
    );
  }

  const byDiretoria = new Map<string, number>();
  reads.forEach((r) => byDiretoria.set(r.diretoria, (byDiretoria.get(r.diretoria) || 0) + 1));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{reads.length} leituras</span>
          <div className="flex gap-1 ml-2">
            {Array.from(byDiretoria.entries()).map(([dir, count]) => (
              <Badge key={dir} variant="outline" className="text-[10px]">
                {dir}: {count}
              </Badge>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" />
          CSV
        </Button>
      </div>
      <div className="rounded-md border max-h-64 overflow-auto">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Diretoria</TableHead>
                <TableHead className="text-xs">Gerência</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Nota</TableHead>
                <TableHead className="text-xs">Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reads.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{r.user_name}</TableCell>
                  <TableCell className="text-xs">{r.diretoria}</TableCell>
                  <TableCell className="text-xs">{r.gerencia}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.read_at ? new Date(r.read_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.rating ? (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {r.rating}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[300px]">
                    {r.feedback ? (
                      <details className="group">
                        <summary className="flex items-center gap-1 cursor-pointer list-none">
                          <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate group-open:whitespace-normal">{r.feedback}</span>
                        </summary>
                      </details>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default PublicationReadStats;
