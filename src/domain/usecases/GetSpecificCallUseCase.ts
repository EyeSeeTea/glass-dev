import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassCall } from "../entities/GlassCallStatus";
import { GlassCallRepository } from "../repositories/GlassCallRepository";

export class GetSpecificCallUseCase implements UseCase {
    constructor(private glassCallRepository: GlassCallRepository) {}

    public execute(module: string, orgUnit: string, period: number): FutureData<GlassCall> {
        return this.glassCallRepository
            .getSpecificCall(module, orgUnit, period)
            .flatMap((data: GlassCall[]): FutureData<GlassCall> => {
                //If calls are filtered on module && orgunit && period, then only one call should be returned,
                //if more are returned, its an error in call data modelling.
                if (data.length === 1 && data[0]) {
                    return Future.success(data[0]);
                }
                //Specific call not found,
                //Set to default status- NOT_COMPLETE, so that user can continue with submission workflow
                else {
                    const defaultCallStatus: GlassCall = {
                        module: module,
                        orgUnit: orgUnit,
                        period: period,
                        status: "NOT_COMPLETED",
                    };
                    return Future.success(defaultCallStatus);
                }
            });
    }
}
