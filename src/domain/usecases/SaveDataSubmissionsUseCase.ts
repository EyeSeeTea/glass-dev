import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassDataSubmission } from "../entities/GlassDataSubmission";
import { generateId } from "../entities/Ref";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";

export class SaveDataSubmissionsUseCase implements UseCase {
    constructor(private glassDataSubmissionRepository: GlassDataSubmissionsRepository) {}

    public execute(module: string, orgUnit: string, periods: string[]): FutureData<void> {
        const dataSubmissions: GlassDataSubmission[] = [];
        periods.forEach(period => {
            dataSubmissions.push({
                id: generateId(),
                module: module,
                orgUnit: orgUnit,
                period: period,
                status: "NOT_COMPLETED",
                statusHistory: [{ to: "NOT_COMPLETED", changedAt: new Date().toISOString() }],
            });
        });

        return this.glassDataSubmissionRepository.saveMultiple(dataSubmissions);
    }
}
