import { Area, Controller, Ctx, Get, Post, Param, QueryParam } from "alosaur/mod.ts";
import type { HttpContext } from "alosaur/mod.ts";
import { parseEntry } from "../Entry.ts";
import { ensureEnv } from "../env.ts";
import { Logger } from "../logutils.ts";

const LOG_FILE_PATH = ensureEnv("ECHO_LOG_FILE_PATH");

const requestLogger = new Logger(LOG_FILE_PATH);

@Controller("/log")
export class LogController {
  @Post()
  async log(@Ctx() ctx: HttpContext) {
    const { request } = ctx;
    const entry = await parseEntry(request);

    requestLogger.logEntry(entry);

    return "logged";
  }

  @Get("/range")
  async range(
    @QueryParam("start") start: string,
    @QueryParam("end") end: string
  ) {
    const lines = await requestLogger.readLines([parseInt(start, 10), parseInt(end, 10)]);
    return lines.map(line => JSON.parse(line));
  }

  @Get("/tail/:lines")
  async tail(@Param("lines") lines: number) {
    const tail = await requestLogger.readLines([lines, -1]);
    return tail.map(line => JSON.parse(line));
  }
}

@Area({
  controllers: [LogController],
})
export class LogArea {}

