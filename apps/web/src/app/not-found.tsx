import Link from "next/link";
import { DistressedSticker } from "@moonwitness/ui";
import { ArrowRight } from "@moonwitness/ui/icons";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <DistressedSticker variant="classified" text="SIGNAL LOST // 404" className="mb-4" />
      <h1 className="cmyk-slip font-brush text-6xl text-white mb-2">FREQUENCY NOT FOUND</h1>
      <p className="font-mono text-sm text-zinc-400 max-w-md mb-6">
        The coordinates you intercepted do not exist in the nocturnal transmission network.
      </p>
      <Link href="/" className="btn-zine btn-pink px-6 py-3 text-sm">
        RETURN TO HOME TRANSMISSION <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

