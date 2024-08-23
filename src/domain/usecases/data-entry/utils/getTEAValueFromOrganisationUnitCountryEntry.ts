import { Country } from "../../../entities/Country";

export function getTEAValueFromOrganisationUnitCountryEntry(
    allCountries: Country[],
    attributeValue: string,
    useCode: boolean
): string {
    return (
        allCountries.find(country => {
            return useCode ? country.code === attributeValue : country.name === attributeValue;
        })?.id || attributeValue
    );
}
