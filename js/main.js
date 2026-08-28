/* ============================================================
   ad. — interactions
   Premium scroll experience: Lenis smooth scrolling + GSAP
   ScrollTrigger choreography (clip-path image reveals, masked
   titles, scrubbed word-fill copy, parallax, velocity-reactive
   marquee, hide-on-scroll nav) with a dependency-free fallback.
   ============================================================ */

(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const useGsap =
    !prefersReduced &&
    typeof window.gsap !== "undefined" &&
    typeof window.ScrollTrigger !== "undefined";

  /* ---------- nav: solid once scrolled, hides on scroll down ---------- */
  const nav = document.querySelector(".nav");
  let lastNavY = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 24);
    if (!prefersReduced) {
      if (y > lastNavY + 4 && y > 360) nav.classList.add("nav-hidden");
      else if (y < lastNavY - 2) nav.classList.remove("nav-hidden");
    }
    lastNavY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- count-up stats ---------- */
  const counters = document.querySelectorAll("[data-count]");

  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const value = target * eased;
      el.textContent = decimals
        ? value.toFixed(decimals)
        : Math.round(value).toLocaleString("en-IN");
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window && !prefersReduced) {
    const cio = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach((el) => {
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const target = parseFloat(el.dataset.count);
      el.textContent = decimals ? target.toFixed(decimals) : target.toLocaleString("en-IN");
    });
  }

  /* ============================================================
     PREMIUM SCROLL (GSAP + ScrollTrigger, Lenis smooth scroll)
     ============================================================ */
  const premium = () => {
    document.documentElement.classList.add("has-gsap");
    gsap.registerPlugin(ScrollTrigger);
    gsap.ticker.lagSmoothing(0);

    /* ----- Lenis: buttery inertia scrolling ----- */
    let lenis = null;
    if (typeof window.Lenis !== "undefined") {
      try {
        lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
      } catch (err) {
        lenis = null; // very old browser — native scroll still works
      }
    }
    if (lenis) {
      window.__adLenis = lenis; // used by the SaaS app (/js/app/)
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));

      // smooth in-page anchors (marketing site only — not the SaaS hash routes)
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener("click", (e) => {
          const id = a.getAttribute("href");
          if (id.startsWith("#/")) return; // app routes
          if (document.documentElement.classList.contains("app-mode")) return; // app owns navigation
          if (id.length > 1) {
            let target = null;
            try { target = document.querySelector(id); } catch (err) { target = null; }
            if (target) {
              e.preventDefault();
              lenis.scrollTo(id === "#top" ? 0 : id, {
                duration: 1.4,
                easing: (t) => 1 - Math.pow(1 - t, 4),
              });
            }
          }
        });
      });
    }

    /* ----- scroll progress bar ----- */
    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    document.body.appendChild(progress);
    gsap.to(progress, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });

    /* ----- hero: scrubbed parallax exit ----- */
    gsap
      .timeline({
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
        defaults: { ease: "none" },
      })
      .to(".hero-kicker", { y: () => window.innerHeight * 0.38 }, 0)
      .to(".hero-title", { y: () => window.innerHeight * 0.25, opacity: 0 }, 0)
      .to(".hero-foot", { y: () => window.innerHeight * 0.16, opacity: 0 }, 0)
      .to(".hero-badge", { y: () => window.innerHeight * 0.3, scale: 0.6 }, 0);

    /* ----- section heads: masked title entrance + scrubbed drift ----- */
    gsap.utils.toArray(".section-head").forEach((head, i) => {
      const label = head.querySelector(".section-label");
      const title = head.querySelector(".section-title");

      gsap
        .timeline({
          scrollTrigger: { trigger: head, start: "top 82%", once: true },
        })
        .from(label, { y: 26, opacity: 0, duration: 0.7, ease: "power3.out" })
        .from(
          title,
          { yPercent: 55, opacity: 0, skewY: 4, duration: 1.3, ease: "expo.out" },
          "-=0.45"
        );

      // slow horizontal drift while the head crosses the viewport
      gsap.fromTo(
        title,
        { x: i % 2 ? -46 : 46 },
        {
          x: i % 2 ? 46 : -46,
          ease: "none",
          scrollTrigger: {
            trigger: head,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    /* ----- work cards: clip-path reveal + inner zoom + parallax ----- */
    gsap.utils.toArray(".work-card").forEach((card, i) => {
      const fig = card.querySelector("figure");
      const img = card.querySelector("img");
      const meta = card.querySelector(".work-meta");

      gsap.set(fig, { clipPath: "inset(16% 10% 16% 10%)" });
      gsap.set(img, { scale: 1.35 });
      img.style.transition = "none"; // keep CSS hover transition out of the reveal

      ScrollTrigger.create({
        trigger: card,
        start: "top 82%",
        once: true,
        onEnter: () => {
          gsap
            .timeline({ defaults: { ease: "expo.out", duration: 1.5 } })
            .to(fig, { clipPath: "inset(0% 0% 0% 0%)" })
            .to(
              img,
              {
                scale: 1.02,
                onComplete: () => {
                  gsap.set(img, { clearProps: "transform" });
                  img.style.transition = ""; // hand hover zoom back to CSS
                },
              },
              "<"
            )
            .from(meta, { y: 46, opacity: 0, duration: 1 }, "<0.18");
        },
      });

      // images float at alternating speeds
      const drift = i % 2 === 0 ? 54 : -42;
      gsap.fromTo(
        fig,
        { y: drift },
        {
          y: -drift,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    /* ----- services: staggered rise ----- */
    gsap.from(".service", {
      y: 70,
      opacity: 0,
      stagger: 0.12,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: ".services", start: "top 80%", once: true },
    });

    /* ----- studio: scrubbed word-by-word text fill ----- */
    const splitWords = (el) => {
      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
            } else {
              const s = document.createElement("span");
              s.className = "word";
              s.textContent = part;
              frag.appendChild(s);
            }
          });
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          Array.from(node.childNodes).forEach(walk);
        }
      };
      walk(el);
    };

    const studioCopy = document.querySelectorAll(".studio-copy");
    if (studioCopy[0]) {
      splitWords(studioCopy[0]);
      gsap.fromTo(
        studioCopy[0].querySelectorAll(".word"),
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: "none",
          scrollTrigger: {
            trigger: studioCopy[0],
            start: "top 78%",
            end: "bottom 45%",
            scrub: true,
          },
        }
      );
    }
    if (studioCopy[1]) {
      gsap.from(studioCopy[1], {
        y: 44,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: studioCopy[1], start: "top 82%", once: true },
      });
    }

    gsap.from(".stat", {
      y: 54,
      opacity: 0,
      stagger: 0.1,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: ".stats", start: "top 82%", once: true },
    });

    /* ----- footer: scrubbed CTA rise ----- */
    gsap.from(".footer .section-label", {
      y: 22,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
      scrollTrigger: { trigger: ".footer", start: "top 80%", once: true },
    });

    gsap.fromTo(
      ".footer-cta",
      { yPercent: 26, opacity: 0.08 },
      {
        yPercent: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".footer",
          start: "top 88%",
          end: "top 32%",
          scrub: 0.4,
        },
      }
    );

    gsap.from(".footer-meta", {
      y: 30,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: ".footer-meta", start: "top 92%", once: true },
    });

    /* ----- showreel: pinned, scroll-scrubbed video ----- */
    const reel = document.querySelector(".reel");
    if (reel) {
      const video = reel.querySelector(".reel-video");
      const frame = reel.querySelector(".reel-frame");
      const title = reel.querySelector(".reel-title");
      const timeEl = reel.querySelector(".reel-time");
      const hint = reel.querySelector(".reel-hint");
      const FALLBACK_DUR = 10.8;

      // mobile: prime the decode pipeline on first touch so scrubbing has frames
      const prime = () => {
        const p = video.play();
        if (p && p.then) p.then(() => video.pause()).catch(() => {});
        window.removeEventListener("touchstart", prime);
      };
      window.addEventListener("touchstart", prime, { passive: true });

      // timecode as SS:FF (frames @30fps)
      const fmt = (t) => {
        const s = Math.floor(t);
        const f = Math.floor((t - s) * 30);
        return `00:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
      };

      const proxy = { p: 0 };
      gsap
        .timeline({
          scrollTrigger: {
            trigger: reel,
            start: "top top",
            end: "+=280%",
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
          },
          defaults: { ease: "none" },
        })
        // scrub the film across the whole pin
        .to(
          proxy,
          {
            p: 1,
            duration: 1,
            onUpdate: () => {
              const dur = video.duration || FALLBACK_DUR;
              if (video.readyState >= 2) {
                video.currentTime = proxy.p * Math.max(dur - 0.05, 0);
              }
              timeEl.textContent = `${fmt(proxy.p * dur)} / ${fmt(dur)}`;
            },
          },
          0
        )
        // frame zooms from a cropped card to full bleed
        .fromTo(
          frame,
          { scale: 0.62, borderRadius: 20 },
          { scale: 1, borderRadius: 0, duration: 0.24, ease: "power2.out" },
          0
        )
        // title drifts up and out once the film takes over
        .to(title, { yPercent: -160, opacity: 0, duration: 0.28, ease: "power1.in" }, 0.06)
        // hint disappears once the user gets it
        .to(hint, { opacity: 0, duration: 0.08 }, 0.14);
    }

    /* ----- marquee: velocity-reactive speed, direction & shear ----- */
    const marquee = document.querySelector(".marquee");
    const track = document.querySelector(".marquee-track");
    track.style.animation = "none"; // GSAP drives it now

    const wrapX = gsap.utils.wrap(-50, 0);
    const skewTo = gsap.quickTo(marquee, "skewX", { duration: 0.5, ease: "power3.out" });
    let xp = 0;
    let vel = 0;
    let lastY = window.scrollY;

    gsap.ticker.add((time, deltaMS) => {
      const y = window.scrollY;
      const raw = ((y - lastY) / Math.max(deltaMS, 1)) * 16.7; // ~px per frame
      lastY = y;
      vel += (raw - vel) * 0.12; // smooth

      // base drift + signed velocity boost (scrolling up reverses it)
      const speed = 0.0019 + gsap.utils.clamp(-90, 90, vel) * 0.00024;
      xp = wrapX(xp - speed * deltaMS);
      gsap.set(track, { xPercent: xp });

      skewTo(gsap.utils.clamp(-8, 8, -vel * 0.18));
    });
  };

  /* ============================================================
     FALLBACK — dependency-free reveals (no GSAP / reduced motion)
     ============================================================ */
  const fallback = () => {
    // showreel: no scrubbing available, so play it as a gentle loop instead
    const video = document.querySelector(".reel-video");
    if (video && !prefersReduced) {
      video.setAttribute("autoplay", "");
      video.setAttribute("loop", "");
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    }

    const revealEls = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window && !prefersReduced) {
      document.querySelectorAll("[data-stagger]").forEach((group) => {
        Array.from(group.children).forEach((child, i) => {
          child.style.setProperty("--stagger", `${i * 90}ms`);
        });
      });

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              io.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("in-view"));
    }
  };

  if (useGsap) premium();
  else fallback();

  /* ---------- custom cursor ---------- */
  if (finePointer && !prefersReduced) {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    let visible = false;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
        // snap ring to cursor on first appearance
        ringX = mouseX;
        ringY = mouseY;
      }
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    document.addEventListener("mouseleave", () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    });

    const lerpRing = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(lerpRing);
    };
    requestAnimationFrame(lerpRing);

    // grow the ring over interactive targets
    const hoverables = "a, button, .work-card, .service";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverables)) ring.classList.add("is-active");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverables)) ring.classList.remove("is-active");
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = 0.3;
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate(0, 0)";
      });
    });
  }

  /* ---------- footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
