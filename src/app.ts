import "https://deno.land/std@0.180.0/dotenv/load.ts";
import { App } from "alosaur/mod.ts";

import { HomeArea } from "./areas/home.area.ts";
import { LogArea } from "./areas/logging.area.ts";

const app = new App({
  areas: [HomeArea, LogArea],
  logging: false,
});

app.listen({ port: 8080 });
