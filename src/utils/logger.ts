import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",

  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:mm:ss.l",
        ignore: "pid,hostname",
        messageFormat: "[{module}] {msg}",
        customColors: "info:cyan,warn:yellow,error:red,debug:gray",
        singleLine: false,
      },
    },
  }),
});

export const serverLogger = logger.child({ module: "SERVER" });
export const bufferLogger = logger.child({ module: "BUFFER" });
export const parserLogger = logger.child({ module: "PARSER" });
export const clientLogger = logger.child({ module: "CLIENT" });
