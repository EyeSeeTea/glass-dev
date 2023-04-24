import { D2Api } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { UsersRepository } from "../../domain/repositories/UsersRepository";
import { apiToFuture } from "../../utils/futures";
import { Ref } from "../../domain/entities/Ref";

export class UsersDefaultRepository implements UsersRepository {
    constructor(private api: D2Api) {}
    getAllFilteredbyOUsAndUserGroups(orgUnits: string[], userGroups: string[]): FutureData<Ref[]> {
        return apiToFuture(
            this.api.models.users.get({
                fields: {
                    id: true,
                },
                filter: {
                    "organisationUnits.id": { in: orgUnits },
                    "userGroups.id": { in: userGroups },
                },
            })
        ).map(res => res.objects);
    }
}
