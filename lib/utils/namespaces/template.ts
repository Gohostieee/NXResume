export const templatesList = [
  "harvard",
] as const;

export type Template = (typeof templatesList)[number];
