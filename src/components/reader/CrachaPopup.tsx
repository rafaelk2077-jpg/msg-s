import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const SESSION_KEY = "cracha_popup_shown";

interface CrachaPopupProps {
  open: boolean;
}

const CrachaPopup = ({ open }: CrachaPopupProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && !sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, [open]);

  return (
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogTitle className="sr-only">Por Trás do Crachá</DialogTitle>
        <DialogDescription className="sr-only">Convite para participar do projeto Por Trás do Crachá</DialogDescription>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Por Trás do Crachá</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Queremos conhecer a pessoa por trás do crachá! Conte sua história e inspire seus colegas.
          </p>
          <Button
            size="lg"
            className="w-full mt-2"
            onClick={() => {
              setVisible(false);
              navigate("/por-tras-do-cracha");
            }}
          >
            Participar agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrachaPopup;
