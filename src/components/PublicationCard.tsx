import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Calendar, FileText } from "lucide-react";
import { Publication } from "@/types/publication";
import { Badge } from "@/components/ui/badge";

interface PublicationCardProps {
  publication: Publication;
  featured?: boolean;
  index?: number;
}

const PublicationCard = ({ publication, featured = false, index = 0 }: PublicationCardProps) => {
  const formattedDate = format(publication.publishedAt, "d 'de' MMMM, yyyy", {
    locale: ptBR
  });

  if (featured) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="group relative overflow-hidden rounded-2xl bg-card">

        <Link to={`/leitura/${publication.slug}`} className="block">
          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {/* Cover Image */}
            <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto md:h-[500px]">
              <img
                src={publication.coverUrl}
                alt={publication.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />

              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent md:bg-gradient-to-r" />
              <Badge className="absolute left-4 top-4 bg-accent text-accent-foreground">
                Mais Recente
              </Badge>
            </div>

            {/* Content */}
            <div className="flex flex-col justify-center p-6 md:p-8 lg:p-12">
              {publication.theme &&
              <span className="mb-3 text-sm font-medium uppercase tracking-wider text-secondary-foreground">
                  {publication.theme}
                </span>
              }
              <h2 className="mb-4 font-display text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                {publication.title}
              </h2>
              {publication.description &&
              <p className="mb-6 text-lg text-muted-foreground leading-relaxed">
                  {publication.description}
                </p>
              }
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {publication.pageCount} páginas
                </span>
              </div>
              <div className="mt-8">
                <span className="inline-flex items-center gap-2 font-medium text-primary transition-colors group-hover:text-accent">
                  Ler publicação
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3" />

                  </svg>
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.article>);

  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="group">

      <Link to={`/leitura/${publication.slug}`} className="block">
        <div className="card-hover overflow-hidden rounded-xl bg-card">
          {/* Cover */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={publication.coverUrl}
              alt={publication.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          {/* Content */}
          <div className="p-4">
            {publication.theme &&
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-secondary-foreground">
                {publication.theme}
              </span>
            }
            <h3 className="mb-2 font-display text-lg font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">
              {publication.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(publication.publishedAt, "MMM yyyy", { locale: ptBR })}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {publication.pageCount}p
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>);

};

export default PublicationCard;