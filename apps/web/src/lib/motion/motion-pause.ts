"use client";

import { createContext, useContext } from "react";

export const MotionPauseContext = createContext(false);

export function useMotionPaused(): boolean {
  return useContext(MotionPauseContext);
}
