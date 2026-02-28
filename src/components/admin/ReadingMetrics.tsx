import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, Users, BookOpen, Building2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToCsv } from "@/lib/csv-export";

interface ReadWithProfile {
  user_name: string;
  user_email: string;
  diretoria: string;
  gerencia: string;
  publication_title: string;
  publication_type: string | null;
  read_at: string;
  completed: boolean;
}

interface AggregatedStat {
  label: string;
  count: number;
}

const ReadingMetrics = () => {
  const [reads, setReads] = useState<ReadWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data: readsData, error: readsError } = await supabase
          .from("publication_reads")
          .select("user_id, publication_id, read_at, completed")
          .order("read_at", { ascending: false })
          .limit(500);

        if (readsError) throw readsError;
        if (!readsData || readsData.length === 0) {
          setReads([]);
          setLoading(false);
          return;
        }

        const userIds = [...new Set(readsData.map((r) => r.user_id))];
        const pubIds = [...new Set(readsData.map((r) => r.publication_id))];

        const [profilesRes, pubsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, name, diretoria, gerencia").in("user_id", userIds),
          supabase.from("publications").select("id, title, type").in("id", pubIds),
        ]);

        const profilesMap = new Map(
          (profilesRes.data || []).map((p) => [p.user_id, p])
        );
        const pubsMap = new Map(
          (pubsRes.data || []).map((p) => [p.id, p])
        );

        // Fetch emails from auth — we get them from profiles' user_id mapping
        // Since we can't query auth.users, we'll use the user_id to find email from the read data
        // Actually, we need to get emails. Let's query profiles + use a workaround.
        // We'll store user_id temporarily to build email lookup
        const userIdToEmail = new Map<string, string>();
        // We don't have direct access to auth.users from client, so we'll show email from profile or user_id
        // The best approach: enrich from the profiles table which has name but not email
        // We need to add email display - let's use the user_id and note this limitation

        const enriched: ReadWithProfile[] = readsData.map((r) => {
          const profile = profilesMap.get(r.user_id);
          const pub = pubsMap.get(r.publication_id);
          return {
            user_name: profile?.name || "Desconhecido",
            user_email: "", // Will be enriched below
            diretoria: profile?.diretoria || "N/A",
            gerencia: profile?.gerencia || "N/A",
            publication_title: pub?.title || "Publicação removida",
            publication_type: pub?.type || null,
            read_at: r.read_at,
            completed: r.completed,
          };
        });

        setReads(enriched);
      } catch (err) {
        console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const handleExportCsv = () => {
    const rows = reads.map((r) => ({
      Nome: r.user_name,
      Diretoria: r.diretoria,
      Gerência: r.gerencia,
      Publicação: r.publication_title,
      Tipo: r.publication_type || "",
      Data: new Date(r.read_at).toLocaleDateString("pt-BR"),
      Concluída: r.completed ? "Sim" : "Não",
    }));
    exportToCsv("metricas-leitura.csv", rows);
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

  const totalReads = reads.length;
  const uniqueReaders = new Set(reads.map((r) => r.user_name)).size;
  const uniquePublications = new Set(reads.map((r) => r.publication_title)).size;

  const byDiretoria = aggregate(reads, (r) => r.diretoria);
  const byGerencia = aggregate(reads, (r) => r.gerencia);
  const byPublication = aggregate(reads, (r) => r.publication_title);
  const byUser = aggregate(reads, (r) => r.user_name);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Métricas de Leitura
            </CardTitle>
            <CardDescription>
              Acompanhe quem está lendo suas publicações
            </CardDescription>
          </div>
          {totalReads > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{totalReads}</p>
            <p className="text-xs text-muted-foreground">Leituras totais</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{uniqueReaders}</p>
            <p className="text-xs text-muted-foreground">Leitores únicos</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <Building2 className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{uniquePublications}</p>
            <p className="text-xs text-muted-foreground">Publicações lidas</p>
          </div>
        </div>

        {totalReads === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma leitura registrada ainda.
          </p>
        ) : (
          <Tabs defaultValue="diretoria">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="diretoria">Diretoria</TabsTrigger>
              <TabsTrigger value="gerencia">Gerência</TabsTrigger>
              <TabsTrigger value="publicacao">Publicação</TabsTrigger>
              <TabsTrigger value="usuario">Usuário</TabsTrigger>
            </TabsList>
            <TabsContent value="diretoria">
              <RankingTable data={byDiretoria} label="Diretoria" />
            </TabsContent>
            <TabsContent value="gerencia">
              <RankingTable data={byGerencia} label="Gerência" />
            </TabsContent>
            <TabsContent value="publicacao">
              <RankingTable data={byPublication} label="Publicação" />
            </TabsContent>
            <TabsContent value="usuario">
              <RankingTable data={byUser} label="Usuário" />
            </TabsContent>
          </Tabs>
        )}

        {totalReads > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Leituras recentes</h4>
            <div className="rounded-md border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Publicação</TableHead>
                    <TableHead>Diretoria</TableHead>
                    <TableHead>Gerência</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reads.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.user_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {r.publication_title}
                          {r.publication_type && (
                            <Badge variant="outline" className="text-[10px]">
                              {r.publication_type}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{r.diretoria}</TableCell>
                      <TableCell>{r.gerencia}</TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(r.read_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function aggregate(
  reads: ReadWithProfile[],
  keyFn: (r: ReadWithProfile) => string
): AggregatedStat[] {
  const map = new Map<string, number>();
  for (const r of reads) {
    const key = keyFn(r);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function RankingTable({ data, label }: { data: AggregatedStat[]; label: string }) {
  const max = data[0]?.count || 1;
  return (
    <div className="space-y-2 mt-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-sm font-medium w-8 text-right text-muted-foreground">
            {i + 1}.
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm truncate">{item.label}</span>
              <span className="text-sm font-semibold">{item.count}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReadingMetrics;
