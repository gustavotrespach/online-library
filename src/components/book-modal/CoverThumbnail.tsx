"use client";

import { BookOpen } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { isOptimizableCover } from "@/lib/books/cover-hosts";

interface CoverThumbnailProps {
  url: string | null;
  title: string;
  // Largura exibida, para o Next.js escolher o tamanho da imagem.
  width: number;
}

// Capa pequena dos resultados e da revisão. Sem capa (ou se ela não
// carregar), um fundo neutro: na estante, o livro usa o fallback com título.
export function CoverThumbnail({ url, title, width }: CoverThumbnailProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url !== null && url !== failedUrl;

  return (
    <div
      className="relative aspect-2/3 shrink-0 overflow-hidden rounded-sm bg-surface"
      style={{ width }}
    >
      {showImage ? (
        <Image
          src={url}
          alt={`Capa de ${title}`}
          fill
          sizes={`${width}px`}
          unoptimized={!isOptimizableCover(url)}
          className="object-cover"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <span className="flex size-full items-center justify-center text-foreground-subtle">
          <BookOpen size={Math.round(width * 0.4)} strokeWidth={1.5} />
        </span>
      )}
    </div>
  );
}
