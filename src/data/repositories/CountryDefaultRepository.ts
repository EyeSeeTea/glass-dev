import { D2Api, MetadataPick } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { apiToFuture } from "../../utils/futures";
import { CountryRepository } from "../../domain/repositories/CountryRepository";
import { Country } from "../../domain/entities/Country";

export class CountryDefaultRepository implements CountryRepository {
    constructor(private api: D2Api) {}

    public getAll(): FutureData<Country[]> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                fields: organisationUnitsFields,
                paging: false,
                level: 3,
            })
        ).map(response => {
            return this.buildOrgUnits(response.objects);
        });
    }

    private buildOrgUnits(d2OrgUnits: D2OrgUnit[]): Country[] {
        return d2OrgUnits.map(d2OrgUnit => ({
            id: d2OrgUnit.id,
            name: d2OrgUnit.name,
            shortName: d2OrgUnit.shortName,
            code: d2OrgUnit.code,
        }));
    }
}

const organisationUnitsFields = {
    id: true,
    name: true,
    shortName: true,
    code: true,
    description: { id: true, name: true },
    geometry: true,
    organisationUnitGroups: { id: true, name: true },
} as const;

type D2OrgUnit = MetadataPick<{
    organisationUnits: { fields: typeof organisationUnitsFields };
}>["organisationUnits"][number];
