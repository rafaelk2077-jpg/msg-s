import logoMsgas from "@/assets/Logo-principal.svg";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-secondary/30">
      <div className="container py-4">
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex items-center gap-3">
            <img
              src={logoMsgas}
              alt="MSGás"
              className="h-16 w-auto"
            />
          </div>

          <div className="flex flex-col items-center gap-1 text-center md:items-end md:text-right">

            <p className="text-xs text-muted-foreground/70">
              © {new Date().getFullYear()} Todos os direitos reservados
            </p>
            <p className="text-xs text-muted-foreground/50">
              Desenvolvido por Studio Kosak
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
