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
        return userGroups.map(ug => {
            switch (ug.name) {
                case "AMR-EGASP access":
                case "AMR-EGASP admin":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "EGASP",
                        moduleId: "CVVp44xiXGJ",
                        viewAccess: true,
                        captureAccess: true,
                    };
                case "AMR-EGASP data capture":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "EGASP",
                        moduleId: "CVVp44xiXGJ",
                        viewAccess: false,
                        captureAccess: true,
                    };
                case "AMR-EGASP data visualizer":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "EGASP",
                        moduleId: "CVVp44xiXGJ",
                        viewAccess: true,
                        captureAccess: false,
                    };
                case "AMR-EGASP user management":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "EGASP",
                        moduleId: "CVVp44xiXGJ",
                        viewAccess: false,
                        captureAccess: false,
                    };

                case "AMR-AMC access":
                case "AMR-AMC admin":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMC",
                        moduleId: "BVnik5xiXGJ",
                        viewAccess: true,
                        captureAccess: true,
                    };
                case "AMR-AMC data capture":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMC",
                        moduleId: "BVnik5xiXGJ",
                        viewAccess: false,
                        captureAccess: true,
                    };
                case "AMR-AMC data visualizer":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMC",
                        moduleId: "BVnik5xiXGJ",
                        viewAccess: true,
                        captureAccess: false,
                    };
                case "AMR-AMC user management":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMC",
                        moduleId: "BVnik5xiXGJ",
                        viewAccess: false,
                        captureAccess: false,
                    };
                case "AMR-AMR access":
                case "AMR-AMR admin":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMR",
                        moduleId: "AVnpk4xiXGG",
                        viewAccess: true,
                        captureAccess: true,
                    };
                case "AMR-AMR data capture":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMR",
                        moduleId: "AVnpk4xiXGG",
                        viewAccess: false,
                        captureAccess: true,
                    };
                case "AMR-AMR data visualizer":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMR",
                        moduleId: "AVnpk4xiXGG",
                        viewAccess: true,
                        captureAccess: false,
                    };
                case "AMR-AMR user management":
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "AMR",
                        moduleId: "AVnpk4xiXGG",
                        viewAccess: false,
                        captureAccess: false,
                    };
                default:
                    return {
                        id: ug.id,
                        name: ug.name,
                        moduleName: "",
                        moduleId: "",
                        viewAccess: false,
                        captureAccess: false,
                    };
            }
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
