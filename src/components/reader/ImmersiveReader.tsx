import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Share2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import PublicationRating from "./PublicationRating";

interface ImmersiveReaderProps {
  pages: string[];
  coverUrl: string;
  title: string;
  isNewsletter?: boolean;
  publicationType?: string;
  publicationId?: string;
  pdfUrl?: string;
  slug?: string;
}

const Page = forwardRef<HTMLDivElement, { src: string; pageNum: number }>(
  ({ src, pageNum }, ref) => (
    <div ref={ref} className="page-content bg-white">
      <img
        src={src}
        alt={`Página ${pageNum}`}
        className="w-full h-full object-contain"
        draggable={false}
        loading={pageNum > 4 ? "lazy" : "eager"}
      />
    </div>
  )
);
Page.displayName = "Page";

const A4_RATIO = 1.414;

function useDimensions(containerRef: React.RefObject<HTMLDivElement | null>, isNewsletter: boolean) {
  const [dimensions, setDimensions] = useState({ width: 400, height: 566 });
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return; // not laid out yet

      const availableHeight = rect.height - 60;
      const availableWidth = rect.width - 120;
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      let pw: number, ph: number;

      if (isNewsletter) {
        // Newsletter: single vertical page, maximise height
        ph = availableHeight;
        pw = ph / A4_RATIO;
        if (pw > availableWidth) {
          pw = availableWidth;
          ph = pw * A4_RATIO;
        }
      } else if (mobile) {
        pw = availableWidth;
        ph = pw * A4_RATIO;
        if (ph > availableHeight) {
          ph = availableHeight;
          pw = ph / A4_RATIO;
        }
      } else {
        ph = availableHeight;
        pw = ph / A4_RATIO;
        if (pw * 2 > availableWidth) {
          pw = availableWidth / 2;
          ph = pw * A4_RATIO;
        }
      }

      setDimensions({ width: Math.floor(Math.max(pw, 200)), height: Math.floor(Math.max(ph, 280)) });
      setReady(true);
    };

    // Initial calculation with retry for layout readiness
    update();
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 200);

    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [containerRef, isNewsletter]);

  return { dimensions, isMobile, ready };
}

const ImmersiveReader = ({ pages, coverUrl, title, isNewsletter = false, publicationType, publicationId, pdfUrl, slug }: ImmersiveReaderProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { dimensions, isMobile, ready } = useDimensions(containerRef, isNewsletter);

  const handleShare = useCallback(async () => {
    const url = slug ? `${window.location.origin}/leitura/${slug}` : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      // Simple feedback via alert-like approach — toast would need import
      alert("Link copiado!");
    }
  }, [title, slug]);

  const handleDownload = useCallback(() => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${title}.pdf`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }, [pdfUrl, title]);

  // For newsletters, never fall back to coverUrl — pages must come from the PDF
  const allPages = isNewsletter ? (pages.length > 0 ? pages : []) : (pages.length > 0 ? pages : [coverUrl]);
  const totalPages = allPages.length;

  useEffect(() => {
    let cancelled = false;
    setImagesLoaded(false);
    setLoadProgress(0);

    const preload = async () => {
      let loaded = 0;
      const promises = allPages.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              loaded++;
              if (!cancelled) setLoadProgress(Math.round((loaded / allPages.length) * 100));
              resolve();
            };
            img.onerror = () => {
              loaded++;
              if (!cancelled) setLoadProgress(Math.round((loaded / allPages.length) * 100));
              resolve(); // Don't block on failed images
            };
            img.src = src;
          })
      );
      await Promise.all(promises);
      if (!cancelled) setImagesLoaded(true);
    };

    preload();
    return () => { cancelled = true; };
  }, [allPages.length, coverUrl]);

  const goToNext = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, []);

  const goToPrev = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  const getPageLabel = () => `Página ${currentPage + 1} de ${totalPages}`;

  // Newsletter: vertical scroll layout, no flipbook
  if (isNewsletter) {
    if (allPages.length === 0) {
      return (
        <div ref={containerRef} className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Esta newsletter não possui páginas processadas.</p>
        </div>
      );
    }

    return (
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
        {/* Top bar: zoom controls */}
        <div className="flex items-center justify-between py-2 px-4 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur">
          <span className="text-sm text-muted-foreground">
            {totalPages} {totalPages === 1 ? "página" : "páginas"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare} title="Compartilhar">
              <Share2 className="h-4 w-4" />
            </Button>
            {pdfUrl && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Baixar PDF">
                <Download className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 10))} disabled={zoom <= 50}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={50} max={200} step={10} className="w-20" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(200, zoom + 10))} disabled={zoom >= 200}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10">{zoom}%</span>
            </div>
            {publicationId && <PublicationRating publicationId={publicationId} />}
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-secondary/30">
          {!imagesLoaded ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">
                Carregando páginas... {loadProgress}%
              </span>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-4 py-6 px-4"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
            >
              {allPages.map((page, index) => (
                <div
                  key={index}
                  
                  className="w-full shadow-lg rounded-sm overflow-hidden bg-white"
                  style={{ maxWidth: "800px" }}
                >
                  <img
                    src={page}
                    alt={`Página ${index + 1}`}
                    className="w-full h-auto object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    );
  }

  // Standard flipbook layout
  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      {/* Flipbook area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-secondary/30 relative">
        {!ready || !imagesLoaded ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              {!imagesLoaded ? `Carregando páginas... ${loadProgress}%` : "Carregando leitor..."}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Previous */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrev}
              disabled={currentPage === 0}
              className="h-10 w-10 rounded-full shrink-0 bg-background/80 backdrop-blur border border-border/50 shadow-sm hover:bg-background z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Flipbook wrapper */}
            <div
              style={{
                width: !isMobile && currentPage <= 1 ? dimensions.width : undefined,
                height: !isMobile && currentPage <= 1 ? dimensions.height : undefined,
                overflow: !isMobile && currentPage <= 1 ? "hidden" : undefined,
                transition: "width 0.4s ease",
              }}
            >
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "center center",
                  transition: "transform 0.4s ease",
                }}
              >
                {/* @ts-ignore - react-pageflip types */}
                <HTMLFlipBook
                  key={`${animationEnabled}-${dimensions.width}-${dimensions.height}`}
                  ref={flipBookRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  size="fixed"
                  showCover={false}
                  mobileScrollSupport={true}
                  onFlip={onFlip}
                  flippingTime={animationEnabled ? 520 : 1}
                  usePortrait={isMobile}
                  startPage={0}
                  drawShadow={true}
                  maxShadowOpacity={0.3}
                  useMouseEvents={true}
                  swipeDistance={30}
                  clickEventForward={false}
                  showPageCorners={animationEnabled}
                  disableFlipByClick={false}
                  className=""
                  style={{}}
                  startZIndex={0}
                  autoSize={false}
                >
                  {allPages.map((page, index) => (
                    <Page key={index} src={page} pageNum={index + 1} />
                  ))}
                </HTMLFlipBook>
              </div>
            </div>

            {/* Next */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              disabled={currentPage >= totalPages - 1}
              className="h-10 w-10 rounded-full shrink-0 bg-background/80 backdrop-blur border border-border/50 shadow-sm hover:bg-background z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur p-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={goToPrev} disabled={currentPage === 0} className="flex-1">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{getPageLabel()}</span>
          <Button variant="outline" size="sm" onClick={goToNext} disabled={currentPage >= totalPages - 1} className="flex-1">
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Desktop bottom bar */}
      <div className="hidden md:flex items-center justify-between py-2.5 px-4 border-t border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{getPageLabel()}</span>
          <div className="flex gap-1">
            {totalPages <= 40 &&
              allPages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => flipBookRef.current?.pageFlip()?.turnToPage(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    currentPage === index
                      ? "w-6 bg-accent"
                      : "w-2 bg-border hover:bg-muted-foreground/30"
                  )}
                />
              ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {currentPage + 1} / {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare} title="Compartilhar">
            <Share2 className="h-4 w-4" />
          </Button>
          {pdfUrl && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Baixar PDF">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 10))} disabled={zoom <= 50}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={50} max={300} step={10} className="w-20" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(300, zoom + 10))} disabled={zoom >= 300}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-10">{zoom}%</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnimationEnabled(!animationEnabled)}
            className={cn(
              "gap-1.5 border-border/50",
              animationEnabled ? "text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-xs">
              {animationEnabled ? "Animação" : "Sem animação"}
            </span>
          </Button>

          {publicationId && <PublicationRating publicationId={publicationId} />}
        </div>
      </div>
      
    </div>
  );
};

export default ImmersiveReader;
