declare module "vitest" {
  export const describe: (
    name: string,
    fn: () => void | Promise<void>,
  ) => void;
  export const it: (
    name: string,
    fn: () => void | Promise<void>,
  ) => void;
  export const expect: any;
}
