"use client";

import dynamic from "next/dynamic";
import type { Contact } from "@/types";

export type CulturalMapProps = {
  contacts: Contact[];
  onChanged: () => void;
  onError: (message: string) => void;
};

const CulturalMapClient = dynamic<CulturalMapProps>(
  () =>
    import("./cultural-map-inner").then(
      (module) => module.CulturalMap
    ),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Cargando mapa...
      </div>
    ),
  }
);

export function CulturalMap(props: CulturalMapProps) {
  return <CulturalMapClient {...props} />;
}