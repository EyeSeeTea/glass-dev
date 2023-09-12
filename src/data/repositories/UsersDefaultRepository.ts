import { D2Api } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../domain/entities/Future";
import { UsersRepository } from "../../domain/repositories/UsersRepository";
import { apiToFuture } from "../../utils/futures";
import { Ref } from "../../domain/entities/Ref";

export class UsersDefaultRepository implements UsersRepository {
    constructor(private api: D2Api) {}
    getUsersFilteredbyOUsAndUserGroups(orgUnitPath: string, userGroups: string[]): FutureData<Ref[]> {
        return apiToFuture(
            this.api.models.users.get({
                paging: false,
                fields: {
                    id: true,
                    userGroups: {
                        id: true,
                    },
                    dataViewOrganisationUnits: {
                        id: true,
                    },
                },
            })
        ).map(res => {
            const users = res.objects;

            //1. Filter users by user group
            const usersByUserGroupAndOU = users.filter(user => user.userGroups.some(ug => userGroups.includes(ug.id)));

            //2. Filter users by org unit if applicable
            if (orgUnitPath !== "") {
                const usersFilteredByOrgUnitHeirarchy = usersByUserGroupAndOU.filter(user =>
                    user.dataViewOrganisationUnits.some(ou => orgUnitPath.includes(ou.id))
                );
                return usersFilteredByOrgUnitHeirarchy;
            } else {
                return usersByUserGroupAndOU;
            }
        });
    }

    savePassword(password: string): FutureData<void | unknown> {
        return apiToFuture(
            this.api.currentUser.get({
                fields: {
                    $all: true,
                    userCredentials: {
                        $owner: true,
                    },
                },
            })
        ).flatMap(currentUser => {
            currentUser.userCredentials.password = password;
            return apiToFuture(
                this.api.metadata.post({
                    users: [currentUser],
                })
            )
                .flatMap(res => {
                    return res.status === "OK" ? Future.success(undefined) : Future.error(res.status);
                })
                .mapError(error => {
                    return error;
                });
        });
    }

    saveLocale(isUiLocale: boolean, locale: string): FutureData<void | unknown> {
        return apiToFuture(
            this.api.post<{ status: "OK" | "SUCCESS" | "WARNING" | "ERROR" }>(
                `/userSettings/${isUiLocale ? "keyUiLocale" : "keyDbLocale"}`,
                { value: locale },
                {}
            )
        )
            .flatMap(res => {
                return res.status === "OK" ? Future.success(undefined) : Future.error(res.status);
            })
            .mapError(error => {
                return error;
            });
    }
}
