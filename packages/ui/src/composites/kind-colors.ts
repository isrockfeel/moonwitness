/** Default colors per item kind/category. Override via props in components. */
export const defaultKindColors: Record<string, string> = {
  PROJECT: "#ff2d78",
  STORY: "#2ea8ff",
  SIGNAL: "#ffd21f",
  WORLD: "#a855f7",
  PEOPLE: "#ff2d78",
  RESEARCH: "#2ea8ff",
};

/** @deprecated Use defaultKindColors */
export const kindColors = defaultKindColors;
