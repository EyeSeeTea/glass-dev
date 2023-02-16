import { D2Api, D2OrganisationUnitSchema, D2UserGroupSchema, SelectedPick } from "@eyeseetea/d2-api/2.34";

import { FutureData, Future } from "../../domain/entities/Future";
import { GlassModule } from "../../domain/entities/GlassModule";
import { OrgUnitAccess, UserAccessInfo, ModuleAccess } from "../../domain/entities/User";
import { InstanceRepository } from "../../domain/repositories/InstanceRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";
import { Instance } from "../entities/Instance";

export class InstanceDefaultRepository implements InstanceRepository {
    private api: D2Api;

    constructor(instance: Instance, private dataStoreClient: DataStoreClient) {
        this.api = getD2APiFromInstance(instance);
    }

    public getBaseUrl(): string {
        return this.api.baseUrl;
    }

    mapUserOrgUnitsAccess = (
        organisationUnits: SelectedPick<
            D2OrganisationUnitSchema,
            {
                id: true;
                name: true;
            }
        >[],
        dataViewOrganisationUnits: SelectedPick<
            D2OrganisationUnitSchema,
            {
                id: true;
                name: true;
            }
        >[]
    ): OrgUnitAccess[] => {
        const orgUnitsAccess = organisationUnits.map(ou => ({
            orgUnitId: ou.id,
            orgUnitName: ou.name,
            readAccess: dataViewOrganisationUnits.findIndex(dvou => dvou.id === ou.id) > -1 ? true : false,
            captureAccess: true,
        }));

        //Setting view access for org units that are present in dataViewOrganisationUnits and not organisationUnits
        dataViewOrganisationUnits.forEach(dvou => {
            if (orgUnitsAccess.findIndex(ou => ou.orgUnitId === dvou.id) === -1) {
                orgUnitsAccess.push({
                    orgUnitId: dvou.id,
                    orgUnitName: dvou.name,
                    readAccess: true,
                    captureAccess: false, //orgUnits in dataViewOrganisationUnits dont have capture access
                });
            }
        });

        //TO DO: TEMP - For testing the OrgUnit Access implementation, consoling the orgUnitAccess.
        //TO DO: Remove once permission implementation done.
        console.debug("Org Unit Access Permissions : " + JSON.stringify(orgUnitsAccess));
        return orgUnitsAccess;
    };

    mapUserGroupAccess = (
        userGroups: SelectedPick<
            D2UserGroupSchema,
            {
                id: true;
                name: true;
            }
        >[]
    ): FutureData<ModuleAccess[]> => {
        return this.dataStoreClient.listCollection<GlassModule>(DataStoreKeys.MODULES).flatMap(modules => {
            //Iterate through modules and populate access for each
            const moduleAccess = modules.map(module => {
                let readAccess = false;
                let writeAccess = false;
                userGroups.forEach(userGroup => {
                    if (
                        module.userGroups.readAccess.find(
                            moduleReadUserGroup => moduleReadUserGroup.id === userGroup.id
                        )
                    ) {
                        readAccess = true;
                    }
                    if (
                        module.userGroups.captureAccess.find(
                            moduleCaptureUserGroup => moduleCaptureUserGroup.id === userGroup.id
                        )
                    ) {
                        writeAccess = true;
                    }
                });

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
                    },
                    dataViewOrganisationUnits: { id: true, name: true },
                },
            })
        ).map(user => ({
            id: user.id,
            name: user.displayName,
            userGroups: user.userGroups,
            ...user.userCredentials,
            userOrgUnitsAccess: this.mapUserOrgUnitsAccess(user.organisationUnits, user.dataViewOrganisationUnits),
            userModulesAccess: this.mapUserGroupAccess(user.userGroups),
        }));
    }

    @cache()
    public getInstanceVersion(): FutureData<string> {
        return apiToFuture(this.api.system.info).map(({ version }) => version);
    }
}
