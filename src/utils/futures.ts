import { CancelableResponse, isCancel } from "@eyeseetea/d2-api/repositories/CancelableResponse";
import { Future, FutureData } from "../domain/entities/Future";

export function apiToFuture<Data>(res: CancelableResponse<Data>): FutureData<Data> {
    return Future.fromComputation((resolve, reject) => {
        res.getData()
            .then(resolve)
            .catch(err => {
                console.error("isCancel:", isCancel(err));
                console.error("message:", err?.message);
                console.error("request:", err?.request);
                console.error("response:", err?.response);
                console.error("API to Future error:", JSON.stringify(err));

                const innerMessage = err?.response?.data?.message;
                const message = err ? err.message : "Unknown error";

                reject(innerMessage ?? message);
            });
        return res.cancel;
    });
}
