"use client";

import { useEffect } from "react";

export function AuditHashOpener() {
  useEffect(() => {
    const revealLinkedDossier = () => {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (!targetId.startsWith("dossier-")) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      if (target instanceof HTMLDetailsElement) target.open = true;

      let ancestor = target.parentElement;
      while (ancestor) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
        ancestor = ancestor.parentElement;
      }

      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
      });
    };

    revealLinkedDossier();
    window.addEventListener("hashchange", revealLinkedDossier);
    return () => window.removeEventListener("hashchange", revealLinkedDossier);
  }, []);

  return null;
}
