import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PublicationCard from "@/components/PublicationCard";
import SearchFilters from "@/components/SearchFilters";
import { PublicationFilter, rowToPublication } from "@/types/publication";
import { usePublications } from "@/hooks/usePublications";
import { FileText } from "lucide-react";

const Index = () => {
  const [filters, setFilters] = useState<PublicationFilter>({});
  const { publications: rows, loading } = usePublications();

  const publications = useMemo(() => rows.map(rowToPublication), [rows]);

  // Find the most recently UPLOADED publication (by created_at) for the featured spot
  // When a type filter is active, show the newest publication of that type instead
  const featuredId = useMemo(() => {
    if (rows.length === 0) return null;
    const candidates = filters.type
      ? rows.filter((r) => r.type === filters.type)
      : rows;
    if (candidates.length === 0) return null;
    const newest = candidates.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b
    );
    return newest.id;
  }, [rows, filters.type]);

  const years = useMemo(() => {
    const unique = [...new Set(publications.map((p) => p.year))];
    return unique.sort((a, b) => b - a);
  }, [publications]);


  const types = useMemo(() => {
    const unique = [
      ...new Set(publications.map((p) => p.type).filter(Boolean)),
    ];
    return unique.sort() as string[];
  }, [publications]);

  const featured = useMemo(() => {
    if (!featuredId) return undefined;
    return publications.find((p) => p.id === featuredId);
  }, [publications, featuredId]);

  const filteredPublications = useMemo(() => {
    return publications.filter((pub) => {
      if (pub.id === featuredId) return false; // exclude featured
      if (filters.year && pub.year !== filters.year) return false;
      if (filters.month && pub.publishedAt.getMonth() + 1 !== filters.month) return false;
      if (filters.type && pub.type !== filters.type) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesTitle = pub.title.toLowerCase().includes(search);
        const matchesDescription = pub.description
          ?.toLowerCase()
          .includes(search);
        const matchesType = pub.type?.toLowerCase().includes(search);
        if (
          !matchesTitle &&
          !matchesDescription &&
          !matchesType
        )
          return false;
      }
      return true;
    });
  }, [publications, filters]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header searchValue={filters.search || ""} onSearchChange={(v) => setFilters((f) => ({ ...f, search: v || undefined }))} />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header searchValue={filters.search || ""} onSearchChange={(v) => setFilters((f) => ({ ...f, search: v || undefined }))} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-secondary/30 to-background">
          <div className="container pt-12 md:pt-16 pb-6 md:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 text-center md:text-left"
            >
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-primary">
                Publicações
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Explore nosso acervo de newsletters e publicações
                institucionais. Cada edição conta uma história de inovação,
                conquistas e perspectivas.
              </p>
            </motion.div>

            <div className="mb-8">
              <SearchFilters
                filters={filters}
                onFilterChange={setFilters}
                years={years}
                types={types}
              />
            </div>

            {featured ? (
              <div className="mt-8">
                <PublicationCard publication={featured} featured />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-secondary/20 rounded-xl"
              >
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">
                  Nenhuma publicação disponível
                </h3>
                <p className="text-muted-foreground">
                  As publicações aparecerão aqui assim que forem adicionadas.
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* Archive Section */}
        {publications.length > 1 && (
          <section className="pt-6 md:pt-8 pb-12 md:pb-16">
            <div className="container">
              <div className="mb-8">
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
                  Arquivo de Edições
                </h2>
                <p className="text-muted-foreground">
                  {filteredPublications.length} publicações disponíveis
                </p>
              </div>

              {filteredPublications.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {filteredPublications.map((publication, index) => (
                    <PublicationCard
                      key={publication.id}
                      publication={publication}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">
                    Nenhuma publicação encontrada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Tente ajustar os filtros ou buscar por outros termos.
                  </p>
                  <button
                    onClick={() => setFilters({})}
                    className="text-accent hover:underline font-medium"
                  >
                    Limpar filtros
                  </button>
                </motion.div>
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
