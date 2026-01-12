import { isElementOfUnion, UnionFromValues } from "./ts-utils";

const logLevels = ["debug", "info", "warn", "error"] as const;
export type LogLevel = UnionFromValues<typeof logLevels>;

const levelFromEnv =
    typeof process !== "undefined" && process.env && process.env["LOG_LEVEL"] ? process.env["LOG_LEVEL"] || "" : "";
const level = isElementOfUnion(levelFromEnv, logLevels) ? levelFromEnv : "debug";
const levelIndex = logLevels.indexOf(level);

function getLogger(logLevelIndex: number, level: LogLevel) {
    return function writer(message: string) {
        const ts = new Date().toISOString().split(".")[0]?.replace("T", " ");
        const formatted = `[${level.toUpperCase()}] [${ts}] ${message}\n`;

        if (logLevelIndex >= levelIndex && typeof process !== "undefined" && process.stderr?.write) {
            process.stderr.write(formatted);
        } else if (logLevelIndex >= levelIndex && typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            (console[level] ?? console.log)(formatted);
        }
    };
}

const consoleLogger = {
    debug: getLogger(0, "debug"),
    info: getLogger(1, "info"),
    warn: getLogger(2, "warn"),
    error: getLogger(3, "error"),
};

export default consoleLogger;
