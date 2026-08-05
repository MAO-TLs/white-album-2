"use client";

import { useState } from "react";

type CopyHashButtonProps = {
  value: string;
};

export function CopyHashButton({ value }: CopyHashButtonProps) {
  const [status, setStatus] = useState("Copy");

  return (
    <button
      className="copy-hash"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setStatus("Copied");
        } catch {
          setStatus("Copy failed");
        }
      }}
    >
      {status}
      <span className="sr-only"> archive SHA-256</span>
    </button>
  );
}
