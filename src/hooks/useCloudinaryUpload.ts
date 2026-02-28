import { useState, useCallback, useRef } from "react";

const CLOUDINARY_CLOUD_NAME = "dh4s7mt6c";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export interface CloudinaryPhotoMeta {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
  created_at: string;
  resource_type?: string;
}

export interface UploadFileState {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  meta?: CloudinaryPhotoMeta;
  error?: string;
  isVideo?: boolean;
}

export interface CloudinaryUploadOptions {
  preset?: string;
  allowVideo?: boolean;
  maxFiles?: number;
  folderPrefix?: string;
}

function slugifyEmail(email: string | undefined | null): string {
  if (!email) return "anon";
  return email
    .toLowerCase()
    .replace(/@/g, "_at_")
    .replace(/\./g, "_")
    .replace(/[^a-z0-9_+%-]/g, "");
}

function buildFolder(email: string | undefined | null, submissionId: string, prefix: string): string {
  const slug = slugifyEmail(email);
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${prefix}/submissions/${slug}/${yyyy}/${mm}/${submissionId}`;
}

function uploadSingleFile(
  file: File,
  folder: string,
  index: number,
  preset: string,
  onProgress: (pct: number) => void
): Promise<CloudinaryPhotoMeta> {
  return new Promise((resolve, reject) => {
    const isVideo = VIDEO_TYPES.includes(file.type);
    const resourceType = isVideo ? "video" : "image";
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
    formData.append("folder", folder);
    formData.append("public_id", `file_${index}_${Date.now()}`);
    formData.append("resource_type", resourceType);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          secure_url: data.secure_url,
          public_id: data.public_id,
          bytes: data.bytes,
          format: data.format,
          width: data.width || 0,
          height: data.height || 0,
          created_at: data.created_at,
          resource_type: data.resource_type,
        });
      } else {
        reject(new Error(`Upload falhou (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.send(formData);
  });
}

export function validateFile(file: File, allowVideo = false): string | null {
  const allowedTypes = allowVideo ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES;
  if (!allowedTypes.includes(file.type)) {
    const formats = allowVideo ? ".jpeg, .jpg, .png, .mp4, .mov, .webm" : ".jpeg, .jpg, .png";
    return `Formato inválido: ${file.name}. Use ${formats}`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `${file.name} excede 10MB`;
  }
  return null;
}

export function useCloudinaryUpload(options: CloudinaryUploadOptions = {}) {
  const {
    preset = "Gásflip",
    allowVideo = false,
    maxFiles = 5,
    folderPrefix = "gasflip",
  } = options;

  const [files, setFiles] = useState<UploadFileState[]>([]);
  const folderRef = useRef<string>("");
  const submissionIdRef = useRef<string>("");

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const remaining = maxFiles - prev.length;
      const toAdd = newFiles.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
        progress: 0,
        isVideo: VIDEO_TYPES.includes(file.type),
      }));
      return [...prev, ...toAdd];
    });
  }, [maxFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadAll = useCallback(
    async (email: string | undefined | null): Promise<{
      submissionId: string;
      photos: CloudinaryPhotoMeta[];
    } | null> => {
      const sid = crypto.randomUUID();
      submissionIdRef.current = sid;
      const folder = buildFolder(email, sid, folderPrefix);
      folderRef.current = folder;

      setFiles((prev) =>
        prev.map((f) =>
          f.status === "pending" || f.status === "error"
            ? { ...f, status: "uploading" as const, progress: 0, error: undefined }
            : f
        )
      );

      const results: CloudinaryPhotoMeta[] = [];
      let hasError = false;

      const currentFiles = await new Promise<UploadFileState[]>((res) =>
        setFiles((prev) => { res(prev); return prev; })
      );

      for (let i = 0; i < currentFiles.length; i++) {
        const f = currentFiles[i];
        if (f.status === "done" && f.meta) {
          results.push(f.meta);
          continue;
        }

        try {
          const meta = await uploadSingleFile(f.file, folder, i, preset, (pct) => {
            setFiles((prev) =>
              prev.map((item, idx) => idx === i ? { ...item, progress: pct } : item)
            );
          });
          results.push(meta);
          setFiles((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "done" as const, progress: 100, meta } : item
            )
          );
        } catch (err: any) {
          hasError = true;
          setFiles((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "error" as const, error: err.message } : item
            )
          );
        }
      }

      if (hasError) return null;
      return { submissionId: sid, photos: results };
    },
    [preset, folderPrefix]
  );

  const retryFile = useCallback(
    async (index: number, email: string | undefined | null) => {
      const folder = folderRef.current || buildFolder(email, submissionIdRef.current || crypto.randomUUID(), folderPrefix);

      setFiles((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, status: "uploading" as const, progress: 0, error: undefined } : item
        )
      );

      const currentFiles = await new Promise<UploadFileState[]>((res) =>
        setFiles((prev) => { res(prev); return prev; })
      );

      const f = currentFiles[index];
      if (!f) return;

      try {
        const meta = await uploadSingleFile(f.file, folder, index, preset, (pct) => {
          setFiles((prev) =>
            prev.map((item, idx) => idx === index ? { ...item, progress: pct } : item)
          );
        });
        setFiles((prev) =>
          prev.map((item, idx) =>
            idx === index ? { ...item, status: "done" as const, progress: 100, meta } : item
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((item, idx) =>
            idx === index ? { ...item, status: "error" as const, error: err.message } : item
          )
        );
      }
    },
    [preset, folderPrefix]
  );

  const reset = useCallback(() => {
    setFiles([]);
    folderRef.current = "";
    submissionIdRef.current = "";
  }, []);

  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const hasErrors = files.some((f) => f.status === "error");
  const isUploading = files.some((f) => f.status === "uploading");

  return {
    files,
    addFiles,
    removeFile,
    uploadAll,
    retryFile,
    reset,
    allDone,
    hasErrors,
    isUploading,
  };
}
