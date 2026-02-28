import logoMsgas from "@/assets/logo-nova.svg";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-secondary/30">
      <div className="container py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <img
              src={logoMsgas}
              alt="MSGás"
              className="h-16 w-auto"
            />
          </div>

          <div className="flex flex-col items-center gap-1 text-center md:items-end md:text-right">
            <p className="text-sm text-muted-foreground">
              Todas as edições disponíveis para leitura digital
            </p>
            <p className="text-xs text-muted-foreground/70">
              © {new Date().getFullYear()} Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
