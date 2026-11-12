/** Structured logger. Everything logged here is shipped to the central log store. */
export const logger = {
  info(message: string, meta: Record<string, unknown> = {}) {
    console.log(JSON.stringify({ level: "info", message, ...meta }));
  },
};
