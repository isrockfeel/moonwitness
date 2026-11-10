import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

export function ZineInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("zine-input", className)} {...props} />;
}
