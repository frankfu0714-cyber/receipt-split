"use client";

import { useRef, useState } from "react";
import type { GeminiReceiptResponse } from "@/lib/types";

interface Props {
  onParsed: (data: GeminiReceiptResponse, imageDataUrl: string) => void;
}

export default function ReceiptUpload({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      await parseReceipt(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  }

  async function parseReceipt(dataUrl: string, fileType: string) {
    setStatus("parsing");
    setErrorMsg("");

    // dataUrl = "data:image/jpeg;base64,<base64>"
    const base64 = dataUrl.split(",")[1];

    try {
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: fileType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Something went wrong.");
        return;
      }
      setStatus("idle");
      onParsed(json as GeminiReceiptResponse, dataUrl);
    } catch {
      setStatus("error");
      setErrorMsg("Network error — check your connection.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card cursor-pointer hover:border-accent transition-colors min-h-[140px] p-6"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Receipt preview"
            className="max-h-48 rounded-xl object-contain"
          />
        ) : (
          <>
            <div className="text-4xl">🧾</div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                Tap to upload receipt
              </p>
              <p className="text-sm text-muted mt-0.5">
                Camera or photo library · drag &amp; drop OK
              </p>
            </div>
          </>
        )}

        {status === "parsing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-card/80 backdrop-blur-sm gap-2">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-accent">Reading receipt…</p>
          </div>
        )}
      </div>

      {preview && status !== "parsing" && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-border py-2 text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Replace photo
        </button>
      )}

      {status === "error" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
