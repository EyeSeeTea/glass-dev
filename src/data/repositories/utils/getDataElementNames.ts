import { D2Api } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { FutureData } from "../../../domain/entities/Future";
import { NamedRef } from "../../../domain/entities/Ref";

export function getDataElementNames(api: D2Api, dataElementIds: string[]): FutureData<NamedRef[]> {
    return apiToFuture(
        api.metadata
            .get({
                dataElements: {
                    fields: { shortName: true, code: true, id: true },
                    filter: { id: { in: dataElementIds } },
                },
            })
            .map(response => {
                if (response?.data?.dataElements) {
                    return response?.data?.dataElements.map(de => {
                        return {
                            id: de.id,
                            name: `${de.shortName}(${de.code})`,
                        };
                    });
                } else {
                    return [];
                }
            })
    );
}
