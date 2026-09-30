"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef } from "react";
import { SITE_HEADER_ID } from "@/components/navbar/Navbar";
import { createVideoScrubber } from "./createVideoScrubber";

gsap.registerPlugin(ScrollTrigger);

// Assets do Hero (decisions.md, 005). Um asset mobile futuro pode ser
// adicionado aqui sem mudar a timeline.
const HERO_MEDIA = {
  idle: "/assets/hero/hero-idle.webm",
  scrub: "/assets/hero/hero-scrub.mp4",
  poster: "/assets/hero/hero-poster.jpg",
};

// Distância de scroll da timeline, em alturas de viewport (decisions.md, 004).
const SCROLL_DISTANCE_IN_VIEWPORTS = 3;
// Segundos que a timeline leva para alcançar o scroll; suaviza o scrub.
const SCRUB_SMOOTHING_SECONDS = 0.5;

// Posições em fração da timeline (0 = início do Hero, 1 = último quadro).
const NAVBAR_REVEAL = {
  start: 0.02,
  duration: 0.12,
  fromY: -12,
};

// Fade entre idle e scrub, na faixa de transições de interface.
const IDLE_FADE_SECONDS = 0.4;
// Fração da timeline abaixo da qual o scrub é considerado de volta ao
// início (< 0,01s de vídeo). A timeline nunca chega a exatamente 0 no topo,
// pois o ScrollTrigger usa start = -0.001.
const IDLE_RETURN_PROGRESS = 0.001;

const OVER_HERO_ATTRIBUTE = "data-over-hero";

// No mobile o crop mostra ~1/4 da largura do quadro; deslocá-lo para a
// esquerda mantém o leitor e o livro visíveis.
const videoClassName =
  "absolute inset-0 size-full object-cover object-[40%_50%] md:object-center";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const scrubVideoRef = useRef<HTMLVideoElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

  // useLayoutEffect: o pin precisa ser desfeito antes de o React remover a
  // seção, pois o ScrollTrigger a envolve em um elemento próprio.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const idleVideo = idleVideoRef.current;
    const scrubVideo = scrubVideoRef.current;
    const scrim = scrimRef.current;
    const header = document.getElementById(SITE_HEADER_ID);
    if (!section || !idleVideo || !scrubVideo || !scrim || !header) return;

    const mm = gsap.matchMedia();

    // Com reduced motion nada é criado: o Hero mostra o poster estático, os
    // vídeos não são baixados e a Navbar permanece no estado padrão.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const scrubber = createVideoScrubber(scrubVideo);
      // Callbacks assíncronas (ex.: rejeição do play()) podem chegar depois
      // da limpeza deste contexto e devem ser ignoradas.
      let isActive = true;

      let isScrubLoading = false;
      const loadScrubVideo = () => {
        if (!isActive || isScrubLoading) return;
        isScrubLoading = true;
        scrubVideo.preload = "auto";
        scrubVideo.load();
      };

      // O idle tem prioridade de download; o scrub começa a carregar quando o
      // idle já toca ou quando o autoplay é negado (o poster fica visível).
      const playIdle = () => {
        idleVideo.play().catch(loadScrubVideo);
      };
      idleVideo.addEventListener("playing", loadScrubVideo, { once: true });
      playIdle();

      // Estados do Hero: "idle" (loop no topo) e "scrub" (vídeo segue o
      // scroll). O idle só toca no estado "idle"; o scrub nunca é reproduzido,
      // apenas posicionado. Assim, nunca há dois vídeos tocando.
      let heroState: "idle" | "scrub" = "idle";
      const fadeIdle = (opacity: number) =>
        gsap.to(idleVideo, {
          opacity,
          duration: IDLE_FADE_SECONDS,
          ease: "power2.out",
          overwrite: true,
        });

      const enterScrub = () => {
        if (heroState === "scrub") return;
        heroState = "scrub";
        loadScrubVideo();
        idleVideo.pause();
        fadeIdle(0);
      };

      const enterIdle = () => {
        if (heroState === "idle") return;
        heroState = "idle";
        playIdle();
        fadeIdle(1);
      };

      // No topo da página o ScrollTrigger usa start = -0.001, então a posição
      // real do scroll é comparada com o início efetivo do Hero.
      const isAtHeroStart = (trigger: ScrollTrigger) =>
        trigger.scroll() <= Math.max(trigger.start, 0);

      const scrollDistance = () =>
        window.innerHeight * SCROLL_DISTANCE_IN_VIEWPORTS;

      const playhead = { progress: 0 };
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${scrollDistance()}`,
          pin: true,
          anticipatePin: 1,
          scrub: SCRUB_SMOOTHING_SECONDS,
          invalidateOnRefresh: true,
          // progress > 0 não indica scroll: o ScrollTrigger chama onUpdate no
          // refresh inicial com um progress transitório.
          onUpdate: (self) => {
            if (!isAtHeroStart(self)) enterScrub();
          },
        },
      });

      timeline.to(
        playhead,
        {
          progress: 1,
          duration: 1,
          onUpdate: () => {
            scrubber.seek(playhead.progress);
            // Volta ao idle só depois que o scrub suavizado alcança o início.
            const pinTrigger = timeline.scrollTrigger;
            if (
              pinTrigger &&
              playhead.progress < IDLE_RETURN_PROGRESS &&
              isAtHeroStart(pinTrigger)
            ) {
              enterIdle();
            }
          },
        },
        0,
      );

      // Navbar invisível e sem receber cliques até a metade da entrada.
      timeline.set(header, { pointerEvents: "none" }, 0);
      timeline.fromTo(
        [header, scrim],
        { opacity: 0, y: (index) => (index === 0 ? NAVBAR_REVEAL.fromY : 0) },
        { opacity: 1, y: 0, duration: NAVBAR_REVEAL.duration },
        NAVBAR_REVEAL.start,
      );
      timeline.set(
        header,
        { pointerEvents: "auto" },
        NAVBAR_REVEAL.start + NAVBAR_REVEAL.duration / 2,
      );

      // Fundo transparente enquanto o Hero estiver sob a Navbar: durante o pin
      // e até a base do Hero passar pelo header.
      const setOverHero = (isOverHero: boolean) =>
        header.toggleAttribute(OVER_HERO_ATTRIBUTE, isOverHero);
      const pinTrigger = timeline.scrollTrigger!;
      const overHeroTrigger = ScrollTrigger.create({
        start: () => pinTrigger.start,
        end: () =>
          pinTrigger.end + section.offsetHeight - header.offsetHeight,
        onUpdate: (self) => setOverHero(self.progress < 1),
      });
      setOverHero(overHeroTrigger.progress < 1);

      return () => {
        isActive = false;
        idleVideo.removeEventListener("playing", loadScrubVideo);
        idleVideo.pause();
        scrubber.destroy();
        header.removeAttribute(OVER_HERO_ATTRIBUTE);
        scrubVideo.currentTime = 0;
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Abertura"
      data-hero
      className="relative h-lvh overflow-hidden bg-black"
    >
      {/* Os vídeos só carregam via JavaScript, e nunca com reduced motion. */}
      <video
        ref={scrubVideoRef}
        src={HERO_MEDIA.scrub}
        poster={HERO_MEDIA.poster}
        muted
        playsInline
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden
        tabIndex={-1}
        className={videoClassName}
      />
      <video
        ref={idleVideoRef}
        src={HERO_MEDIA.idle}
        poster={HERO_MEDIA.poster}
        muted
        playsInline
        loop
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden
        tabIndex={-1}
        className={videoClassName}
      />
      {/* Mantém a Navbar legível sobre os quadros claros do fim do vídeo. */}
      <div
        ref={scrimRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-black/60 to-transparent opacity-0"
      />
    </section>
  );
}
