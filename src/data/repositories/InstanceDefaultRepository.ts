import { D2Api, D2DataElementSchema, D2TrackedEntityType, SelectedPick } from "@eyeseetea/d2-api/2.34";

import _ from "lodash";
import { DataElement, DataForm } from "../../domain/entities/DataForm";
import { FutureData, Future } from "../../domain/entities/Future";
import { GlassModule } from "../../domain/entities/GlassModule";
import { Id, NamedRef } from "../../domain/entities/Ref";
import { OrgUnitAccess, UserAccessInfo, ModuleAccess } from "../../domain/entities/User";
import { InstanceRepository } from "../../domain/repositories/InstanceRepository";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";
import { Instance } from "../entities/Instance";

type GeneralInfoType = {
    countryLevel: number;
    enrolmentProgram: string;
    regionLevel: number;
};

const KOSOVO = "NEPywTBN52g";
const allowedNaOrgUnits = [KOSOVO];

export class InstanceDefaultRepository implements InstanceRepository {
    private api: D2Api;

    constructor(instance: Instance, private dataStoreClient: DataStoreClient) {
        this.api = getD2APiFromInstance(instance);
    }

    public getBaseUrl(): string {
        return this.api.baseUrl;
    }

    mapUserOrgUnitsAccess = (
        organisationUnits: { name: string; id: string; shortName: string; code: string; path: string }[],
        dataViewOrganisationUnits: { name: string; id: string; shortName: string; code: string; path: string }[]
    ): OrgUnitAccess[] => {
        let orgUnitsAccess = organisationUnits.map(ou => ({
            orgUnitId: ou.id,
            orgUnitName: ou.name,
            orgUnitShortName: ou.shortName,
            orgUnitCode: ou.code,
            orgUnitPath: ou.path,
            readAccess: dataViewOrganisationUnits.some(dvou => dvou.id === ou.id),
            captureAccess: true,
        }));

        //Setting view access for org units that are present in dataViewOrganisationUnits and not organisationUnits
        const readOnlyAccessOrgUnits = dataViewOrganisationUnits
            .filter(dvou => orgUnitsAccess.every(oua => oua.orgUnitId !== dvou.id))
            .map(raou => ({
                orgUnitId: raou.id,
                orgUnitName: raou.name,
                orgUnitShortName: raou.shortName,
                orgUnitCode: raou.code,
                orgUnitPath: raou.path,
                readAccess: true,
                captureAccess: false, //orgUnits in dataViewOrganisationUnits dont have capture access
            }));

        orgUnitsAccess = [...orgUnitsAccess, ...readOnlyAccessOrgUnits].sort((a, b) =>
            a.orgUnitShortName.localeCompare(b.orgUnitShortName)
        );

        return orgUnitsAccess;
    };

    mapUserGroupAccess = (
        userGroups: NamedRef[]
    ): FutureData<{ moduleAccess: ModuleAccess[]; quarterlyPeriodModules: { id: string; name: string }[] }> => {
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
                    populateCurrentYearInHistory: module.populateCurrentYearInHistory ? true : false,
                    readAccess: readAccess,
                    captureAccess: writeAccess,
                    usergroups: [...module.userGroups.captureAccess, ...module.userGroups.readAccess],
                };
            });
            const quarterlyPeriodModules: { id: string; name: string }[] = modules
                .filter(module => module.dataSubmissionPeriod === "QUARTERLY")
                .map(module => {
                    return { id: module.id, name: module.name };
                });

            return Future.success({
                moduleAccess,
                quarterlyPeriodModules,
            });
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
                    gender: true,
                    email: true,
                    phoneNumber: true,
                    introduction: true,
                    birthday: true,
                    nationality: true,
                    employer: true,
                    jobTitle: true,
                    education: true,
                    interests: true,
                    languages: true,
                    settings: {
                        keyUiLocale: true,
                        keyDbLocale: true,
                        keyMessageEmailNotification: true,
                        keyMessageSmsNotification: true,
                    },
                    organisationUnits: {
                        id: true,
                        name: true,
                        shortName: true,
                        code: true,
                        path: true,
                        children: true,
                        level: true,
                        parent: {
                            id: true,
                            code: true,
                        },
                    },
                    dataViewOrganisationUnits: {
                        id: true,
                        name: true,
                        shortName: true,
                        code: true,
                        level: true,
                        path: true,
                        parent: {
                            id: true,
                            code: true,
                        },
                    },
                },
            })
        ).flatMap(user => {
            const { organisationUnits, dataViewOrganisationUnits } = user;

            const countryOrgUnits: { name: string; id: string; shortName: string; code: string; path: string }[] = [];
            const dataViewCountryOrgUnits: {
                name: string;
                id: string;
                shortName: string;
                code: string;
                path: string;
            }[] = [];

            return this.dataStoreClient.getObject(DataStoreKeys.GENERAL).flatMap(generalInfo => {
                const countryLevel = (generalInfo as GeneralInfoType).countryLevel;

                organisationUnits.forEach(orgUnit => {
                    if (
                        orgUnit.level === countryLevel &&
                        (orgUnit.parent.code !== "NA" || allowedNaOrgUnits.includes(orgUnit.id))
                    ) {
                        countryOrgUnits.push({
                            name: orgUnit.name,
                            id: orgUnit.id,
                            shortName: orgUnit.shortName,
                            code: orgUnit.code,
                            path: orgUnit.path,
                        });
                    }
                });

                dataViewOrganisationUnits.forEach(dataViewOrgUnit => {
                    if (
                        dataViewOrgUnit.level === countryLevel &&
                        (dataViewOrgUnit.parent.code !== "NA" || allowedNaOrgUnits.includes(dataViewOrgUnit.id))
                    ) {
                        dataViewCountryOrgUnits.push({
                            name: dataViewOrgUnit.name,
                            id: dataViewOrgUnit.id,
                            shortName: dataViewOrgUnit.shortName,
                            code: dataViewOrgUnit.code,
                            path: dataViewOrgUnit.path,
                        });
                    }
                });

                return this.getAllCountryOrgUnits(organisationUnits, countryLevel).flatMap(childrenOrgUnits => {
                    return this.getAllCountryOrgUnits(dataViewOrganisationUnits, countryLevel).flatMap(
                        childrenDataViewOrgUnits => {
                            const uniqueOrgUnits = _.uniqBy([...countryOrgUnits, ...childrenOrgUnits], "id");
                            const uniqueDataViewOrgUnits = _.uniqBy(
                                [...dataViewCountryOrgUnits, ...childrenDataViewOrgUnits],
                                "id"
                            );

                            return this.mapUserGroupAccess(user.userGroups).map(
                                ({ moduleAccess, quarterlyPeriodModules }): UserAccessInfo => {
                                    return {
                                        id: user.id,
                                        name: user.displayName,
                                        userGroups: user.userGroups,
                                        ...user.userCredentials,
                                        userOrgUnitsAccess: this.mapUserOrgUnitsAccess(
                                            uniqueOrgUnits,
                                            uniqueDataViewOrgUnits
                                        ),
                                        userModulesAccess: moduleAccess,
                                        quarterlyPeriodModules: quarterlyPeriodModules,
                                        gender: user.gender,
                                        email: user.email,
                                        phoneNumber: user.phoneNumber,
                                        introduction: user.introduction,
                                        birthday: user.birthday,
                                        nationality: user.nationality,
                                        employer: user.employer,
                                        jobTitle: user.jobTitle,
                                        education: user.education,
                                        interests: user.interests,
                                        languages: user.languages,
                                        settings: {
                                            keyUiLocale: user.settings.keyUiLocale,
                                            keyDbLocale: user.settings.keyDbLocale,
                                            keyMessageEmailNotification: user.settings.keyMessageEmailNotification,
                                            keyMessageSmsNotification: user.settings.keyMessageSmsNotification,
                                        },
                                    };
                                }
                            );
                        }
                    );
                });
            });
        });
    }

    @cache()
    public getInstanceVersion(): FutureData<string> {
        return apiToFuture(this.api.system.info).map(({ version }) => version);
    }

    private getAllCountryOrgUnits(
        orgUnits: { name: string; id: string; shortName: string; code: string; path: string }[],
        countryLevel: number
    ): FutureData<{ name: string; id: string; shortName: string; code: string; path: string }[]> {
        const result: { name: string; id: string; shortName: string; code: string; path: string }[] = [];

        const recursiveGetOrgUnits = (
            filteredOUs: { name: string; id: string; code: string; path: string }[],
            countryLevel: number
        ): FutureData<{ name: string; id: string; shortName: string; code: string; path: string }[]> => {
            const childrenOrgUnits = apiToFuture(
                this.api.models.organisationUnits.get({
                    filter: {
                        level: { le: countryLevel.toString() },
                    },
                    fields: {
                        id: true,
                        name: true,
                        shortName: true,
                        code: true,
                        path: true,
                        level: true,
                        parent: {
                            id: true,
                            code: true,
                        },
                    },
                    paging: false,
                })
            ).map(res => {
                const filteredIds = filteredOUs.map(ou => ou.id);
                const childOrgUnits = res.objects.filter(ou => filteredIds.includes(ou.parent?.id));
                return childOrgUnits;
            });

            return childrenOrgUnits.flatMap(childrenOrgUnits => {
                if (childrenOrgUnits[0] && childrenOrgUnits[0]?.level < countryLevel) {
                    return this.getAllCountryOrgUnits(
                        childrenOrgUnits.map(el => {
                            return { name: el.name, id: el.id, shortName: el.shortName, code: el.code, path: el.path };
                        }),
                        countryLevel
                    );
                } else {
                    childrenOrgUnits.forEach(el => {
                        if (el.parent.code !== "NA" || allowedNaOrgUnits.includes(el.id))
                            result.push({
                                name: el.name,
                                id: el.id,
                                shortName: el.shortName,
                                code: el.code,
                                path: el.path,
                            });
                    });
                    return Future.success(result);
                }
            });
        };

        return recursiveGetOrgUnits(orgUnits, countryLevel).flatMap(orgUnits => {
            return Future.success(orgUnits);
        });
    }

    @cache()
    async getProgramAsync(id: Id): Promise<DataForm[]> {
        const { objects } = await this.api.models.programs
            .get({
                paging: false,
                fields: programFields,
                filter: {
                    id: { eq: id },
                },
            })
            .getData();

        return objects.map(
            ({
                id,
                displayName,
                name,
                access,
                programStages,
                programType,
                attributeValues,
                programTrackedEntityAttributes,
                trackedEntityType,
            }) => ({
                type: programType === "WITH_REGISTRATION" ? "trackerPrograms" : "programs",
                id,
                attributeValues,
                name: displayName ?? name,
                periodType: "Daily",
                //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
                readAccess: access.data?.read,
                //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
                writeAccess: access.data?.write,
                dataElements: programStages.flatMap(({ programStageDataElements }) =>
                    programStageDataElements.map(({ dataElement }) => formatDataElement(dataElement))
                ),
                sections: programStages.map(({ id, name, programStageDataElements, repeatable }) => ({
                    id,
                    name,
                    dataElements: programStageDataElements.map(({ dataElement }) => formatDataElement(dataElement)),
                    repeatable,
                })),
                teiAttributes: programTrackedEntityAttributes.map(({ trackedEntityAttribute }) => ({
                    id: trackedEntityAttribute.id,
                    name: trackedEntityAttribute.name,
                    valueType: trackedEntityAttribute.valueType,
                })),
                trackedEntityType: getTrackedEntityTypeFromApi(trackedEntityType),
            })
        );
    }

    public getProgram(programId: Id): FutureData<any> {
        const cacheKey = `program-${programId}`;

        return this.getFromCacheOrRemote(
            cacheKey,
            apiToFuture(
                this.api.models.programs.get({
                    fields: programFields,
                    includeAncestors: true,
                    filter: { id: { eq: programId } },
                })
            ).map(response => {
                if (response.objects[0])
                    return {
                        type: response.objects[0].programType === "WITH_REGISTRATION" ? "trackerPrograms" : "programs",
                        id: response.objects[0].id,
                        attributeValues: response.objects[0].attributeValues,
                        name: response.objects[0].displayName,
                        periodType: "Daily",

                        readAccess: response.objects[0].access.read,

                        writeAccess: response.objects[0].access.write,
                        dataElements: response.objects[0].programStages.flatMap(({ programStageDataElements }) =>
                            programStageDataElements.map(({ dataElement }) => formatDataElement(dataElement))
                        ),
                        sections: response.objects[0].programStages.map(
                            ({ id, name, programStageDataElements, repeatable }) => ({
                                id,
                                name,
                                dataElements: programStageDataElements.map(({ dataElement }) =>
                                    formatDataElement(dataElement)
                                ),
                                repeatable,
                            })
                        ),
                        teiAttributes: response.objects[0].programTrackedEntityAttributes.map(
                            ({ trackedEntityAttribute }) => ({
                                id: trackedEntityAttribute.id,
                                name: trackedEntityAttribute.name,
                            })
                        ),
                        trackedEntityType: getTrackedEntityTypeFromApi(response.objects[0].trackedEntityType),
                    };
                else return Future.error("unable to fetch program");
            })
        );
    }

    private inmemoryCache: Record<string, unknown> = {};
    private getFromCacheOrRemote<T>(cacheKey: string, future: FutureData<T>): FutureData<T> {
        if (this.inmemoryCache[cacheKey]) {
            const responseInCache = this.inmemoryCache[cacheKey] as T;
            return Future.success(responseInCache);
        } else {
            return future.map(response => {
                this.inmemoryCache[cacheKey] = response;
                return response;
            });
        }
    }
}

const formatDataElement = (de: SelectedPick<D2DataElementSchema, typeof dataElementFields>): DataElement => ({
    id: de.id,
    name: de.formName ?? de.name ?? "",
    valueType: de.valueType,
    categoryOptionCombos: de.categoryCombo?.categoryOptionCombos ?? [],
    options: de.optionSet?.options,
});
type TrackedEntityTypeApi = Pick<D2TrackedEntityType, "id" | "featureType">;

function getTrackedEntityTypeFromApi(
    trackedEntityType?: TrackedEntityTypeApi
): DataForm["trackedEntityType"] | undefined {
    // TODO: Review when adding other types
    if (!trackedEntityType) return undefined;

    const d2FeatureType = trackedEntityType.featureType;
    const featureType = d2FeatureType === "POINT" ? "point" : d2FeatureType === "POLYGON" ? "polygon" : "none";
    return { id: trackedEntityType.id, featureType };
}
const dataElementFields = {
    id: true,
    formName: true,
    name: true,
    valueType: true,
    categoryCombo: { categoryOptionCombos: { id: true, name: true } },
    optionSet: { id: true, options: { id: true, code: true } },
} as const;

const programFields = {
    id: true,
    displayName: true,
    name: true,
    attributeValues: { value: true, attribute: { code: true } },
    programStages: {
        id: true,
        name: true,
        programStageDataElements: { dataElement: dataElementFields },
        repeatable: true,
    },
    programTrackedEntityAttributes: { trackedEntityAttribute: { id: true, name: true, valueType: true } },
    access: true,
    programType: true,
    trackedEntityType: { id: true, featureType: true },
} as const;
