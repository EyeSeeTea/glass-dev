import { OrgUnitAccess } from "../../../entities/User";

export function getTEAValueFromOrganisationUnitCountryEntry(
    orgUnitsWithAccess: OrgUnitAccess[],
    attributeValue: string,
    useCode: boolean
): string {
    return (
        orgUnitsWithAccess.find(orgUnit => {
            return useCode ? orgUnit.orgUnitCode === attributeValue : orgUnit.orgUnitName === attributeValue;
        })?.orgUnitId || attributeValue
    );
}
