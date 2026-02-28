import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicationRow } from "@/types/publication";
import { useCallback } from "react";

async function fetchPublications(): Promise<PublicationRow[]> {
  const { data, error } = await supabase
    .from("publications")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export function usePublications() {
  const queryClient = useQueryClient();

  const { data: publications = [], isLoading: loading } = useQuery({
    queryKey: ["publications"],
    queryFn: fetchPublications,
    staleTime: 30_000, // 30s before refetch
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["publications"] });
  }, [queryClient]);

  return { publications, loading, refetch };
}
