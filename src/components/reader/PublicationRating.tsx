import { useState, useEffect } from "react";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PublicationRatingProps {
  publicationId: string;
}

const PublicationRating = ({ publicationId }: PublicationRatingProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !publicationId) return;
    supabase
      .from("publication_ratings")
      .select("id, rating, feedback")
      .eq("user_id", user.id)
      .eq("publication_id", publicationId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRating(data.rating);
          setFeedback(data.feedback || "");
          setExistingId(data.id);
        }
      });
  }, [user, publicationId]);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSaving(true);
    try {
      if (existingId) {
        await supabase
          .from("publication_ratings")
          .update({ rating, feedback: feedback || null } as any)
          .eq("id", existingId);
      } else {
        const { data } = await supabase
          .from("publication_ratings")
          .insert({
            publication_id: publicationId,
            user_id: user.id,
            rating,
            feedback: feedback || null,
          } as any)
          .select("id")
          .single();
        if (data) setExistingId((data as any).id);
      }
      toast({ title: "Avaliação salva!", description: "Obrigado pelo feedback." });
      setOpen(false);
    } catch {
      toast({ title: "Erro ao salvar avaliação", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-border/50"
        >
          <Star className={cn("h-3.5 w-3.5", rating > 0 ? "fill-yellow-400 text-yellow-400" : "")} />
          <span className="text-xs">{rating > 0 ? `${rating}/5` : "Avaliar"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium">Avalie esta publicação</p>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-colors",
                    (hovered || rating) >= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Deixe um comentário (opcional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={rating === 0 || saving}
            onClick={handleSubmit}
          >
            {saving ? "Salvando..." : existingId ? "Atualizar" : "Enviar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PublicationRating;
