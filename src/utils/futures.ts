import { CancelableResponse } from "@eyeseetea/d2-api/repositories/CancelableResponse";
import { Future, FutureData } from "../domain/entities/Future";

export function apiToFuture<Data>(res: CancelableResponse<Data>): FutureData<Data> {
    /* return Future.fromComputation((resolve, reject) => {
         res.getData()
             .then(resolve)
             .catch(err => {
                 console.log(err);
                 const innerMessage = err?.response?.data?.message;
                 const message = err ? err.message : "Unknown error";
 
                 reject(innerMessage ?? message);
             });
         return res.cancel;
     });*/

    return Future.fromComputation((resolve, reject) => {
        res.getData()
            .then(resolve)
            .catch(err => {
                console.error("FULL ERROR:", err);
                console.error("ERROR CODE:", (err as any)?.code);
                console.error("CAUSE CODE:", (err as any)?.cause?.code);

                try {
                    const util = require("node:util");
                    console.error("Raw error:", util.inspect(err, { depth: 10, colors: true }));
                    if ((err as any)?.cause) {
                        console.error("Error cause:", util.inspect((err as any).cause, { depth: 10, colors: true }));
                    }
                } catch {
                    // purposely empty: If util.inspect isn't available (e.g., in a browser), we can skip this step
                }

                const code = (err as any)?.code ?? (err as any)?.cause?.code ?? (err as any)?.cause?.errno ?? undefined;

                const request = (err as any)?.request;
                const cause = (err as any)?.cause;
                const stack = (err as any)?.stack;

                const innerMessage = (err as any)?.response?.data?.message;
                const message = innerMessage || (err?.message ?? "Unknown error");

                // Create an Error object and attach diagnostics so downstream code can read them
                const e = new Error(message);
                (e as any).code = code;
                (e as any).request = request;
                (e as any).cause = cause;
                (e as any).stack = stack;
                console.log("apiToFuture - rejecting with error:", e);
                reject(e.message + e.stack + JSON.stringify(e.cause));
            });
        return res.cancel;
    });
}
