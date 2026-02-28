import { Link, useNavigate } from "react-router-dom";
import { Search, LogOut, Settings, MessageSquarePlus, UserRound, Menu, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import logoMsgas from "@/assets/logo-nova.svg";
import FeedbackDialog from "@/components/FeedbackDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { AvatarCropper } from "@/components/AvatarCropper";

interface HeaderProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  minimal?: boolean;
}

const Header = ({ searchValue, onSearchChange, minimal = false }: HeaderProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
   const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
   const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
   const [avatarUploading, setAvatarUploading] = useState(false);
   const avatarInputRef = useRef<HTMLInputElement | null>(null);
   const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
   const [avatarCropOpen, setAvatarCropOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Erro ao buscar perfil:", error);
        return;
      }
      if (data) {
        setProfileName(data.name);
        const avatar = (data as any).avatar_url as string | null | undefined;
        if (avatar) setAvatarUrl(avatar);
      }
    };
    fetchProfile();
  }, [user]);

  const displayName = profileName || user?.email?.split("@")[0] || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione uma imagem válida (JPG, PNG, WebP...).",
        variant: "destructive",
      });
      return;
    }

    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc);
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarCropSrc(objectUrl);
    setAvatarCropOpen(true);
  };

  const handleAvatarCropped = (blob: Blob) => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const preview = URL.createObjectURL(blob);
    setAvatarBlob(blob);
    setAvatarPreview(preview);
    setAvatarCropOpen(false);

    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc);
      setAvatarCropSrc(null);
    }
  };

  const handleConfirmAvatarUpload = async () => {
    if (!user || !avatarBlob) return;

    try {
      setAvatarUploading(true);

      const path = `user-avatars/${user.id}/avatar-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarBlob, {
          upsert: true,
          contentType: "image/webp",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = publicUrlData.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl as any })
        .eq("user_id", user.id);

      if (profileError) {
        throw profileError;
      }

      setAvatarUrl(publicUrl);
      setAvatarDialogOpen(false);
      setAvatarBlob(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }

      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });
    } catch (err: any) {
      console.error("Erro ao atualizar avatar:", err);
      toast({
        title: "Erro ao atualizar foto",
        description: err?.message || "Ocorreu um erro ao enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/home" className="flex items-center group shrink-0">
          <img
            src={logoMsgas}
            alt="MSGás"
            className="h-16 w-auto transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Desktop items — hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 ml-auto shrink-0">
          {!minimal && onSearchChange && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar publicações..."
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-9 bg-card border-border/50 focus:border-accent focus:ring-accent/20"
              />
            </div>
          )}

          {user && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/por-tras-do-cracha")}
            >
              <UserRound className="h-4 w-4" />
              <span className="text-xs">Por Trás do Crachá</span>
            </Button>
          )}

          {user && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setFeedbackOpen(true)}
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span className="text-xs">Feedback</span>
            </Button>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity shrink-0">
                <Avatar className="h-8 w-8">
                  {avatarUrl && (
                    <AvatarImage
                      src={avatarUrl}
                      alt={displayName || user?.email || "Avatar"}
                    />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium max-w-[150px] truncate">
                  {displayName}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-border/50 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {avatarUrl && (
                      <AvatarImage
                        src={avatarUrl}
                        alt={displayName || user?.email || "Avatar"}
                      />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setAvatarDialogOpen(true)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  <span>Alterar foto de perfil</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/administrador")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Painel Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile hamburger menu — visible only on mobile */}
        <div className="md:hidden ml-auto">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col h-full">
                {/* User info */}
                {user && (
                  <div className="flex items-center gap-3 p-4 border-b border-border/50">
                    <Avatar className="h-10 w-10">
                      {avatarUrl && (
                        <AvatarImage
                          src={avatarUrl}
                          alt={displayName || user?.email || "Avatar"}
                        />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                      <button
                        type="button"
                        className="mt-1 text-xs text-accent hover:underline inline-flex items-center gap-1"
                        onClick={() => setAvatarDialogOpen(true)}
                      >
                        <Camera className="h-3 w-3" />
                        <span>Alterar foto de perfil</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col gap-1 p-3">
                  {/* Search */}
                  {!minimal && onSearchChange && (
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar publicações..."
                        value={searchValue || ""}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 h-9 bg-card border-border/50 focus:border-accent focus:ring-accent/20"
                      />
                    </div>
                  )}

                  {user && (
                    <Button
                      variant="ghost"
                      className="justify-start gap-2"
                      onClick={() => { setMobileOpen(false); navigate("/por-tras-do-cracha"); }}
                    >
                      <UserRound className="h-4 w-4" />
                      Por Trás do Crachá
                    </Button>
                  )}

                  {user && (
                    <Button
                      variant="ghost"
                      className="justify-start gap-2"
                      onClick={() => { setMobileOpen(false); setFeedbackOpen(true); }}
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      Feedback
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      className="justify-start gap-2"
                      onClick={() => { setMobileOpen(false); navigate("/administrador"); }}
                    >
                      <Settings className="h-4 w-4" />
                      Painel Admin
                    </Button>
                  )}
                </div>

                {/* Logout */}
                {user && (
                  <div className="p-3 border-t border-border/50">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => { setMobileOpen(false); handleLogout(); }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <Dialog
        open={avatarDialogOpen}
        onOpenChange={(open) => {
          setAvatarDialogOpen(open);
          if (!open) {
            setAvatarBlob(null);
            if (avatarPreview) {
              URL.revokeObjectURL(avatarPreview);
              setAvatarPreview(null);
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar foto de perfil</DialogTitle>
            <DialogDescription>
              Selecione uma nova imagem para o seu avatar. Ela será exibida em
              toda a interface.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {avatarPreview ? (
                  <AvatarImage
                    src={avatarPreview}
                    alt="Pré-visualização do avatar"
                  />
                ) : avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={displayName || user?.email || "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Clique em &quot;Escolher imagem&quot; para selecionar uma
                  foto do seu dispositivo.
                </p>
                <p>Formatos recomendados: JPG, PNG ou WebP.</p>
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
              >
                Escolher imagem
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleConfirmAvatarUpload}
                disabled={!avatarBlob || avatarUploading}
              >
                {avatarUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
      {avatarCropSrc && (
        <AvatarCropper
          imageSrc={avatarCropSrc}
          open={avatarCropOpen}
          onClose={() => {
            setAvatarCropOpen(false);
            if (avatarCropSrc) {
              URL.revokeObjectURL(avatarCropSrc);
              setAvatarCropSrc(null);
            }
          }}
          onCropComplete={handleAvatarCropped}
        />
      )}
    </header>
  );
};

export default Header;