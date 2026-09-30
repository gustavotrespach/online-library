// Meio quadro a 24 fps: diferenças menores não mudam o quadro exibido.
const FRAME_TOLERANCE_SECONDS = 1 / 48;

export interface VideoScrubber {
  /** Posiciona o vídeo em uma fração (0–1) da sua duração. */
  seek: (progress: number) => void;
  destroy: () => void;
}

/**
 * Converte progresso em `currentTime` sem enfileirar seeks: enquanto um seek
 * está em andamento, apenas o alvo mais recente é guardado e aplicado no
 * evento `seeked`. Evita que o vídeo fique atrasado em relação ao scroll
 * quando decodificar um quadro é mais lento que a taxa de eventos de scroll.
 */
export function createVideoScrubber(video: HTMLVideoElement): VideoScrubber {
  let targetProgress = 0;

  const applyTarget = (force = false) => {
    if (video.readyState < HTMLMediaElement.HAVE_METADATA || video.seeking) {
      return;
    }

    const targetTime = targetProgress * video.duration;
    if (
      force ||
      Math.abs(video.currentTime - targetTime) > FRAME_TOLERANCE_SECONDS
    ) {
      video.currentTime = targetTime;
    }
  };

  const handleSeeked = () => applyTarget();
  // O seek inicial forçado faz alguns navegadores (Safari/iOS) exibirem o
  // quadro correspondente em vez de continuarem mostrando o poster.
  const handleLoadedMetadata = () => applyTarget(true);

  video.addEventListener("seeked", handleSeeked);
  video.addEventListener("loadedmetadata", handleLoadedMetadata);

  return {
    seek(progress) {
      targetProgress = Math.min(Math.max(progress, 0), 1);
      applyTarget();
    },
    destroy() {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    },
  };
}
