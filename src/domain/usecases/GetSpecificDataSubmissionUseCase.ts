import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDataSubmission } from "../entities/GlassDataSubmission";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";

export class GetSpecificDataSubmissionUseCase implements UseCase {
    constructor(private glassDataSubmissionRepository: GlassDataSubmissionsRepository) {}

    public execute(module: string, orgUnit: string, period: number): FutureData<GlassDataSubmission> {
        return this.glassDataSubmissionRepository
            .getSpecificDataSubmission(module, orgUnit, period)
            .flatMap((data: GlassDataSubmission[]): FutureData<GlassDataSubmission> => {
                //If data-submissions are filtered on module && orgunit && period, then only one data-submission should be returned,
                //if more are returned, its an error in data-submission data modelling.
                if (data.length === 1 && data[0]) {
                    return Future.success(data[0]);
                }
                //Specific data-submission not found,
                //Set to default status- NOT_COMPLETE, so that user can continue with upload workflow
                //TO DO : Save new data-submission to datastore
                else {
                    const defaultDataSubmission: GlassDataSubmission = {
                        module: module,
                        orgUnit: orgUnit,
                        period: period,
                        status: "NOT_COMPLETED",
                    };
                    return Future.success(defaultDataSubmission);
                }
            });
    }
}
