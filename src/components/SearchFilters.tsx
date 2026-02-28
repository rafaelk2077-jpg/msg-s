import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PublicationFilter } from "@/types/publication";

interface SearchFiltersProps {
  filters: PublicationFilter;
  onFilterChange: (filters: PublicationFilter) => void;
  years: number[];
  themes: string[];
  types: string[];
}

const SearchFilters = ({
  filters,
  onFilterChange,
  years,
  themes,
  types,
}: SearchFiltersProps) => {
  const hasActiveFilters = filters.year || filters.theme || filters.type || filters.search;

  const clearFilters = () => {
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      {/* Type Filter - Primary filter buttons */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!filters.type ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange({ ...filters, type: undefined })}
            className="h-8"
          >
            Todos
          </Button>
          {types.map((type) => (
            <Button
              key={type}
              variant={filters.type === type ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onFilterChange({
                  ...filters,
                  type: filters.type === type ? undefined : type,
                })
              }
              className="h-8"
            >
              {type}
            </Button>
          ))}
        </div>
      )}

      {/* Secondary Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filtrar por:</span>
        </div>

        <Select
          value={filters.year?.toString() || "all"}
          onValueChange={(value) =>
            onFilterChange({
              ...filters,
              year: value === "all" ? undefined : parseInt(value),
            })
          }
        >
          <SelectTrigger className="w-[130px] h-9 bg-card border-border/50">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.theme || "all"}
          onValueChange={(value) =>
            onFilterChange({
              ...filters,
              theme: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[160px] h-9 bg-card border-border/50">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {theme}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{filters.search}"
              <button
                onClick={() =>
                  onFilterChange({ ...filters, search: undefined })
                }
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.type && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {filters.type}
              <button
                onClick={() => onFilterChange({ ...filters, type: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.year && (
            <Badge variant="secondary" className="gap-1">
              {filters.year}
              <button
                onClick={() => onFilterChange({ ...filters, year: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.theme && (
            <Badge variant="secondary" className="gap-1">
              {filters.theme}
              <button
                onClick={() => onFilterChange({ ...filters, theme: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
