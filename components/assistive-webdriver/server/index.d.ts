export type LogFunction = (entry: any) => void;
export const start: (
  args: string[],
  env: string | boolean,
  options: { log: (entry: any) => void; setLogLevel: (level: string) => void }
) => Promise<() => Promise<void>>;
