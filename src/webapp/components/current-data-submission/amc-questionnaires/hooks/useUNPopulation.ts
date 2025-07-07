import React from "react";
import { UNPopulation } from "../../../../../domain/entities/amc-questionnaires/UNPopulation";
import { Id } from "../../../../../domain/entities/Ref";
import { Maybe } from "../../../../../types/utils";
import { useAppContext } from "../../../../contexts/app-context";

export function useUNPopulation() {
    const { compositionRoot } = useAppContext();
    const [unPopulation, setUNPopulation] = React.useState<Maybe<UNPopulation>>(undefined);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    const fetchUNPopulation = React.useCallback(
        (orgUnitId: Id, period: string) => {
            setIsLoading(true);
            setUNPopulation(undefined);
            return compositionRoot.amcQuestionnaires.getUNPopulation(orgUnitId, period).run(
                unPopulation => {
                    setUNPopulation(unPopulation);
                    setIsLoading(false);
                },
                (error: unknown) => {
                    console.error("Error fetching UN Population:", error);
                    setUNPopulation(undefined);
                    setIsLoading(false);
                }
            );
        },
        [compositionRoot.amcQuestionnaires]
    );

    return {
        unPopulation,
        isLoading,
        fetchUNPopulation,
    };
}
