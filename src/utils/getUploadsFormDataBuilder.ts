import { BrowserUploadsFormDataBuilder } from "../data/repositories/utils/builders/BrowserUploadsFormDataBuilder";
import { NodeUploadsFormDataBuilder } from "../data/repositories/utils/builders/NodeUploadsFormDataBuilder";
import { UploadsFormDataBuilder } from "../data/repositories/utils/builders/UploadsFormDataBuilder";

export function getUploadsFormDataBuilder(runtime: "node" | "browser"): UploadsFormDataBuilder {
    switch (runtime) {
        case "node":
            return new NodeUploadsFormDataBuilder();
        case "browser":
            return new BrowserUploadsFormDataBuilder();
        default:
            console.error(`[UploadsFormDataBuilder] Unknown runtime: ${runtime}`);
            throw new Error(`[UploadsFormDataBuilder] Unknown runtime: ${runtime}`);
    }
}
