import React from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { CountryInformation } from "../../../domain/entities/CountryInformation";
import { GlassState } from "../../hooks/State";

export type CountryInformationState = GlassState<CountryInformation>;

export function useCountryInformation(compositionRoot: CompositionRoot, countryId: string, module: string) {
    const [result, setResult] = React.useState<CountryInformationState>({
        kind: "loading",
    });

    React.useEffect(() => {
        if (countryId && module) {
            compositionRoot.countries.getInformation(countryId, module).run(
                data => setResult({ kind: "loaded", data }),
                error => setResult({ kind: "error", message: error })
            );
        }
    }, [compositionRoot, countryId, module]);

    return result;
}
