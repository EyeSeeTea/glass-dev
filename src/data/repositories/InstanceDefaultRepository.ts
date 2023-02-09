import { D2Api, D2OrganisationUnitSchema, D2UserGroupSchema, SelectedPick } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { OrgUnitAccess, UserAccessInfo, UserGroupAccess } from "../../domain/entities/User";
import { InstanceRepository } from "../../domain/repositories/InstanceRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

export class InstanceDefaultRepository implements InstanceRepository {
    private api: D2Api;

    constructor(instance: Instance) {
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
        return organisationUnits.map(ou => ({
            id: ou.id,
            name: ou.name,
            viewAccess: dataViewOrganisationUnits.findIndex(dvou => dvou.id === ou.id) > -1 ? true : false,
            captureAccess: true,
        }));
    };

    mapUserGroupAccess = (
        userGroups: SelectedPick<
            D2UserGroupSchema,
            {
                id: true;
                name: true;
            }
        >[]
    ): UserGroupAccess[] => {
        console.debug(userGroups);
        return [];
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
