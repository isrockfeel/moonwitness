import { Suspense } from "react";
import { NetworkCenter } from "@/components/network";

export const metadata = {
  title: "VPN & Mesh Tunnel — MoonWitness Underground",
  description: "WireGuard & encrypted peer-to-peer mesh networking command tunnel.",
};

export default function VpnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
          CONNECTING UNDERGROUND VPN TUNNEL…
        </div>
      }
    >
      <NetworkCenter />
    </Suspense>
  );
}
