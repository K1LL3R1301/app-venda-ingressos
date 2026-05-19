"use client";

import { useRef, useState } from "react";

type EventImageUploadKind =
  | "cover"
  | "banner"
  | "thumbnail"
  | "mobile-banner"
  | "sector-map"
  | "gallery"
  | "event-image";

type EventImageUploadFieldProps = {
  label: string;
  value: string;
  kind: EventImageUploadKind;
  onChange: (url: string) => void;
  helper?: string;
};

type UploadResponse = {
  kind?: string;
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  url?: string;
  message?: string;
};

function formatFileSize(size?: number) {
  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function EventImageUploadField({
  label,
  value,
  kind,
  onChange,
  helper,
}: EventImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
  } | null>(null);

  async function handleUpload(file: File) {
    const token = sessionStorage.getItem("astro_session_token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    setUploading(true);
    setFileInfo({
      name: file.name,
      size: file.size,
    });

    try {
      const response = await fetch(
        "http://localhost:3001/v1/uploads/event-image",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const result = (await response.json()) as UploadResponse;

      if (!response.ok) {
        alert(
          typeof result?.message === "string"
            ? result.message
            : "Erro ao enviar imagem.",
        );
        return;
      }

      if (!result.url) {
        alert("Upload concluído, mas a API não retornou a URL da imagem.");
        return;
      }

      onChange(result.url);
    } catch (error) {
      console.error("EVENT IMAGE UPLOAD ERROR:", error);
      alert("Erro ao conectar com a API de upload.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    void handleUpload(file);

    event.target.value = "";
  }

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-800">{label}</p>

          {helper ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {helper}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {uploading ? "Enviando..." : value ? "Trocar imagem" : "Escolher imagem"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {fileInfo ? (
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
          {fileInfo.name} {formatFileSize(fileInfo.size) ? `• ${formatFileSize(fileInfo.size)}` : ""}
        </div>
      ) : null}

      {value ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img
            src={value}
            alt={label}
            className="h-40 w-full object-cover"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
          Nenhuma imagem enviada.
        </div>
      )}

      {value ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            URL gerada
          </p>

          <p className="mt-2 break-all rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            {value}
          </p>
        </div>
      ) : null}
    </div>
  );
}