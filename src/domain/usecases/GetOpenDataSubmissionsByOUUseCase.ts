import { UseCase } from "../../CompositionRoot";
import { getCurrentOpenQuarterlyPeriod, getCurrentOpenYearlyPeriod } from "../../utils/currentPeriodHelper";
import { Future, FutureData } from "../entities/Future";
import { GlassDataSubmission } from "../entities/GlassDataSubmission";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";

export class GetOpenDataSubmissionsByOUUseCase implements UseCase {
    constructor(private glassDataSubmissionRepository: GlassDataSubmissionsRepository) {}

    public execute(orgUnit: string): FutureData<GlassDataSubmission[]> {
        //Open Data Submissions are for the previous year and quarter
        return Future.joinObj({
            yearlyDataSubmissions: this.glassDataSubmissionRepository.getOpenDataSubmissionsByOU(
                orgUnit,
                getCurrentOpenYearlyPeriod()
            ),
            quarterlyDataSubmissions: this.glassDataSubmissionRepository.getOpenDataSubmissionsByOU(
                orgUnit,
                getCurrentOpenQuarterlyPeriod()
            ),
        }).flatMap(({ yearlyDataSubmissions, quarterlyDataSubmissions }) => {
            const consolidatedDataSubmissions = [...yearlyDataSubmissions, ...quarterlyDataSubmissions];
            return Future.success(consolidatedDataSubmissions);
        });
    }
}
