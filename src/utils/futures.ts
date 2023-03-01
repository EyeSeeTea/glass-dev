import { CancelableResponse } from "@eyeseetea/d2-api/repositories/CancelableResponse";
import { Future, FutureData } from "../domain/entities/Future";

export function apiToFuture<Data>(res: CancelableResponse<Data>): FutureData<Data> {
    return Future.fromComputation((resolve, reject) => {
        res.getData()
            .then(resolve)
            .catch(err => {
                const innerMessage = err?.response?.data?.message;
                const message = err ? err.message : "Unknown error";

                reject(innerMessage ?? message);
            });
        return res.cancel;
    });
}
