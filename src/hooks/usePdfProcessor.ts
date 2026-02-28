import { useState, useCallback, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { supabase } from "@/integrations/supabase/client";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface ProcessingProgress {
  current: number;
  total: number;
  status: string;
  percent: number;
}

interface ProcessResult {
  pageUrls: string[];
  pageCount: number;
}

const BATCH_SIZE = 5;
const PAGE_TIMEOUT = 30000;
const UPLOAD_TIMEOUT = 120000;
const MAX_RETRIES = 3;

export function usePdfProcessor() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    current: 0,
    total: 0,
    status: "",
    percent: 0,
  });
  const abortRef = useRef(false);

  const withTimeout = <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(message)), ms)
      )
    ]);
  };

  const renderPageToBlob = async (
    page: pdfjsLib.PDFPageProxy,
    scale: number = 2.5 // Good balance between quality and file size
  ): Promise<Blob> => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d")!;
    
    await withTimeout(
      page.render({ canvasContext: context, viewport }).promise,
      PAGE_TIMEOUT,
      "Timeout ao renderizar página"
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao converter página em imagem"));
        },
        "image/webp",
        0.92 // High quality, smaller files
      );
    });
  };

  const uploadWithRetry = async (
    pagePath: string,
    blob: Blob,
    pageNum: number,
  ): Promise<string> => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (abortRef.current) throw new Error("Upload cancelado");

      try {
        const uploadPromise = supabase.storage
          .from("publications")
          .upload(pagePath, blob, {
            contentType: "image/webp",
            upsert: true,
          });

        const { error: uploadError } = await withTimeout(
          uploadPromise,
          UPLOAD_TIMEOUT,
          `Timeout ao enviar página ${pageNum} (tentativa ${attempt}/${MAX_RETRIES})`,
        );

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("publications")
          .getPublicUrl(pagePath);

        return urlData.publicUrl;
      } catch (err) {
        console.warn(`[PDF] Upload attempt ${attempt}/${MAX_RETRIES} failed for page ${pageNum}:`, err);
        if (attempt === MAX_RETRIES) throw err;
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    throw new Error(`Falha ao enviar página ${pageNum} após ${MAX_RETRIES} tentativas`);
  };

  const uploadPageBatch = async (
    pages: { pageNum: number; blob: Blob }[],
    slug: string,
  ): Promise<string[]> => {
    const urls: string[] = [];

    for (const { pageNum, blob } of pages) {
      if (abortRef.current) throw new Error("Upload cancelado");

      const pagePath = `pages/${slug}/page-${String(pageNum).padStart(3, "0")}.webp`;
      const url = await uploadWithRetry(pagePath, blob, pageNum);
      urls.push(url);

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return urls;
  };

  const processAndUpload = useCallback(
    async (pdfFile: File, slug: string): Promise<ProcessResult> => {
      setProcessing(true);
      abortRef.current = false;
      setProgress({ current: 0, total: 0, status: "Carregando PDF...", percent: 0 });

      try {
        console.log("[PDF] Starting PDF processing for:", slug);
        
        const arrayBuffer = await withTimeout(
          pdfFile.arrayBuffer(),
          30000,
          "Timeout ao carregar arquivo PDF"
        );
        console.log("[PDF] ArrayBuffer created, size:", arrayBuffer.byteLength);

        setProgress({ current: 0, total: 0, status: "Analisando documento...", percent: 5 });

        const pdf = await withTimeout(
          pdfjsLib.getDocument({ data: arrayBuffer }).promise,
          30000,
          "Timeout ao processar PDF"
        );
        
        const totalPages = pdf.numPages;
        console.log("[PDF] PDF loaded, total pages:", totalPages);

        if (totalPages === 0) {
          throw new Error("PDF não contém páginas");
        }

        const pageUrls: string[] = [];
        let processedCount = 0;

        // Process in batches
        for (let batchStart = 1; batchStart <= totalPages; batchStart += BATCH_SIZE) {
          if (abortRef.current) throw new Error("Processamento cancelado");

          const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalPages);
          const batchPages: { pageNum: number; blob: Blob }[] = [];

          // Render batch
          for (let i = batchStart; i <= batchEnd; i++) {
            setProgress({
              current: i,
              total: totalPages,
              status: `Renderizando página ${i} de ${totalPages}...`,
              percent: 10 + (i / totalPages) * 40, // 10-50%
            });

            console.log(`[PDF] Rendering page ${i}/${totalPages}`);
            const page = await pdf.getPage(i);
            const blob = await renderPageToBlob(page);
            batchPages.push({ pageNum: i, blob });
            
            // Yield to UI
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Upload batch
          setProgress({
            current: batchEnd,
            total: totalPages,
            status: `Enviando páginas ${batchStart}-${batchEnd} de ${totalPages}...`,
            percent: 50 + (batchEnd / totalPages) * 45, // 50-95%
          });

          const batchUrls = await uploadPageBatch(batchPages, slug);
          pageUrls.push(...batchUrls);
          processedCount = batchEnd;

          console.log(`[PDF] Batch ${batchStart}-${batchEnd} completed`);
        }

        setProgress({
          current: totalPages,
          total: totalPages,
          status: "Concluído!",
          percent: 100,
        });

        console.log("[PDF] All pages processed successfully");
        return { pageUrls, pageCount: totalPages };
      } catch (error) {
        console.error("[PDF] Processing error:", error);
        setProgress(prev => ({
          ...prev,
          status: `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        }));
        throw error;
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const cancelProcessing = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { processAndUpload, processing, progress, cancelProcessing };
}
