import { D2Api } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { FutureData, Future } from "../../domain/entities/Future";
import { GlassModule } from "../../domain/entities/GlassModule";
import { NamedRef } from "../../domain/entities/Ref";
import { OrgUnitAccess, UserAccessInfo, ModuleAccess } from "../../domain/entities/User";
import { InstanceRepository } from "../../domain/repositories/InstanceRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";
import { Instance } from "../entities/Instance";

const COUNTRY_LEVEL = 2;

export class InstanceDefaultRepository implements InstanceRepository {
    private api: D2Api;

    constructor(instance: Instance, private dataStoreClient: DataStoreClient) {
        this.api = getD2APiFromInstance(instance);
    }

    public getBaseUrl(): string {
        return this.api.baseUrl;
    }

    mapUserOrgUnitsAccess = (organisationUnits: NamedRef[], dataViewOrganisationUnits: NamedRef[]): OrgUnitAccess[] => {
        let orgUnitsAccess = organisationUnits.map(ou => ({
            orgUnitId: ou.id,
            orgUnitName: ou.name,
            readAccess: dataViewOrganisationUnits.some(dvou => dvou.id === ou.id),
            captureAccess: true,
        }));

        //Setting view access for org units that are present in dataViewOrganisationUnits and not organisationUnits
        const readOnlyAccessOrgUnits = dataViewOrganisationUnits
            .filter(dvou => orgUnitsAccess.every(oua => oua.orgUnitId !== dvou.id))
            .map(raou => ({
                orgUnitId: raou.id,
                orgUnitName: raou.name,
                readAccess: true,
                captureAccess: false, //orgUnits in dataViewOrganisationUnits dont have capture access
            }));

        orgUnitsAccess = [...orgUnitsAccess, ...readOnlyAccessOrgUnits];

        //TO DO: TEMP - For testing the OrgUnit Access implementation, consoling the orgUnitAccess.
        //TO DO: Remove once permission implementation done.
        console.debug("Org Unit Access Permissions : " + JSON.stringify(orgUnitsAccess));

        return orgUnitsAccess;
    };

    mapUserGroupAccess = (userGroups: NamedRef[]): FutureData<ModuleAccess[]> => {
        return this.dataStoreClient.listCollection<GlassModule>(DataStoreKeys.MODULES).flatMap(modules => {
            //Iterate through modules and populate access for each
            const moduleAccess = modules.map(module => {
                const readAccess = module.userGroups.readAccess.some(moduleReadUserGroup =>
                    userGroups.some(ug => ug.id === moduleReadUserGroup.id)
                );

                const writeAccess = module.userGroups.captureAccess.some(moduleCaptureUserGroup =>
                    userGroups.some(ug => ug.id === moduleCaptureUserGroup.id)
                );
                return {
                    moduleId: module.id,
                    moduleName: module.name,
                    readAccess: readAccess,
                    captureAccess: writeAccess,
                    usergroups: [...module.userGroups.captureAccess, ...module.userGroups.readAccess],
                };
            });
            //TO DO: TEMP - For testing the Module Access implementation, consoling the moduleAccess.
            //TO DO: Remove once permission implementation done.
            console.debug("Module Access Permissions : " + JSON.stringify(moduleAccess));
            return Future.success(moduleAccess);
        });
    };

    @cache()
    public getCurrentUser(): FutureData<UserAccessInfo> {
        return apiToFuture(
            this.api.currentUser.get({
                fields: {
                    id: true,
                    displayName: true,
                    userGroups: { id: true, name: true },
                    userCredentials: {
                        username: true,
                        userRoles: { id: true, name: true, authorities: true },
                    },
                    organisationUnits: {
                        id: true,
                        name: true,
                        children: true,
                        level: true,
                    },
                    dataViewOrganisationUnits: { id: true, name: true },
                },
            })
        ).flatMap(user => {
            const { organisationUnits } = user;
            const countryOrgUnits: { name: string; id: string }[] = [];

            organisationUnits.forEach(orgUnit => {
                if (orgUnit.level === COUNTRY_LEVEL) countryOrgUnits.push({ name: orgUnit.name, id: orgUnit.id });
            });

            return apiToFuture(
                this.api.models.organisationUnits.get({
                    filter: { "parent.id": { in: organisationUnits.map(ou => ou.id) } },
                    fields: {
                        id: true,
                        name: true,
                        level: true,
                    },
                })
            ).flatMap(({ objects }) => {
                objects.forEach(orgUnit => {
                    if (orgUnit.level === COUNTRY_LEVEL) countryOrgUnits.push(orgUnit);
                });

                const uniqueOrgUnits = _.uniqBy(countryOrgUnits, "id").sort((a, b) => a.name.localeCompare(b.name));

                return this.mapUserGroupAccess(user.userGroups).map((userModulesAccess): UserAccessInfo => {
                    return {
                        id: user.id,
                        name: user.displayName,
                        userGroups: user.userGroups,
                        ...user.userCredentials,
                        userOrgUnitsAccess: this.mapUserOrgUnitsAccess(uniqueOrgUnits, user.dataViewOrganisationUnits),
                        userModulesAccess: userModulesAccess,
                    };
                });
            });
        });
    }

    @cache()
    public getInstanceVersion(): FutureData<string> {
        return apiToFuture(this.api.system.info).map(({ version }) => version);
    }
}
