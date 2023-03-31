export function ensureEnv(key: string) {
  const envVar = Deno.env.get(key);

  if (!envVar) {
    throw new Error(`Environment variable "${ key }" is not defined`);
  }

  return envVar;
}
