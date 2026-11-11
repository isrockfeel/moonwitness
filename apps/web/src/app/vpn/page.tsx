import { Suspense } from "react";
import { VpnView } from "@/views/vpn";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata = {
  title: "VPN & Mesh Tunnel — MoonWitness Underground",
  description: "WireGuard & encrypted peer-to-peer mesh networking command tunnel.",
};

export default function VpnPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
            CONNECTING UNDERGROUND VPN TUNNEL…
          </div>
        }
      >
        <VpnView />
      </Suspense>
    </AuthGuard>
  );
}
