import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { usePublications } from "@/hooks/usePublications";
import { usePublicationActions } from "@/hooks/usePublicationActions";
import UploadForm from "@/components/admin/UploadForm";
import PublicationsTable from "@/components/admin/PublicationsTable";
import { FeedbackView, CrachaView } from "@/components/admin/SubmissionsView";
import logoMsgas from "@/assets/Logo-principal.svg";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { publications, loading: loadingPubs, refetch } = usePublications();
  const {
    handleDelete,
    handleDuplicate,
    handleReprocessPdf,
    processing,
  } = usePublicationActions(refetch);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin");
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Voltar ao site</span>
              </Link>
            </Button>
            <img src={logoMsgas} alt="MSGás" className="h-14 sm:h-16 w-auto shrink-0" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 sm:py-8 px-4">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Upload Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <UploadForm onPublished={refetch} />
          </motion.div>

          {/* Publications List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Publicações
                </CardTitle>
                <CardDescription>
                  {publications.length} publicações no acervo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPubs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : publications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma publicação cadastrada</p>
                    <p className="text-sm">
                      Faça upload de um PDF para começar
                    </p>
                  </div>
                ) : (
                  <PublicationsTable
                    publications={publications}
                    processing={processing}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onReprocess={handleReprocessPdf}
                    onRefresh={refetch}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Feedbacks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <FeedbackView />
        </motion.div>

        {/* Por Trás do Crachá */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <CrachaView />
        </motion.div>
      </main>
    </div>
  );
};

export default Admin;
