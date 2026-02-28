import { useParams, Link } from "react-router-dom";
import { Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import ImmersiveReader from "@/components/reader/ImmersiveReader";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PublicationRow } from "@/types/publication";
import { ArrowLeft } from "lucide-react";

const Reader = () => {
  const { slug } = useParams<{ slug: string }>();
  const [publication, setPublication] = useState<PublicationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPublication = async () => {
      try {
        const { data, error } = await supabase
          .from("publications")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setNotFound(true);
        } else {
          setPublication(data);
          // Track read
          if (user) {
            supabase
              .from("publication_reads")
              .upsert(
                { user_id: user.id, publication_id: data.id },
                { onConflict: "user_id,publication_id" }
              )
              .then();
          }
        }
      } catch (error: any) {
        toast({
          title: "Erro ao carregar publicação",
          description: error.message,
          variant: "destructive",
        });
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPublication();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !publication) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold mb-4">
            Publicação não encontrada
          </h1>
          <p className="text-muted-foreground mb-6">
            A publicação que você procura não existe ou foi removida.
          </p>
          <Button asChild>
            <Link to="/home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = format(
    new Date(publication.published_at),
    "d 'de' MMMM 'de' yyyy",
    { locale: ptBR },
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Publication info */}
      <section className="border-b border-border/50 bg-secondary/20 shrink-0">
        <div className="container py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {publication.theme && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {publication.theme.split(",").map((cat, i) => (
                    <Badge key={i} variant="outline">
                      {cat.trim()}
                    </Badge>
                  ))}
                </div>
              )}
              <h1 className="font-display text-xl md:text-2xl font-bold mb-1">
                {publication.title}
              </h1>
              {publication.description && (
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {publication.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {publication.page_count} páginas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Reader fills remaining space */}
      <ImmersiveReader
        pages={publication.pages}
        coverUrl={publication.cover_url}
        title={publication.title}
        isNewsletter={publication.type?.toLowerCase() === "newsletter"}
        publicationType={publication.type ?? undefined}
        publicationId={publication.id}
        pdfUrl={publication.pdf_url ?? undefined}
        slug={publication.slug}
      />
    </div>
  );
};

export default Reader;
