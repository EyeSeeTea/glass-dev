import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { GlassDataSubmission } from "../entities/GlassDataSubmission";
import { generateId } from "../entities/Ref";
import { GlassDataSubmissionsRepository } from "../repositories/GlassDataSubmissionRepository";
import { moduleProperties } from "../utils/ModuleProperties";

export class GetSpecificDataSubmissionUseCase implements UseCase {
    constructor(private glassDataSubmissionRepository: GlassDataSubmissionsRepository) {}

    public execute(
        module: string,
        orgUnit: string,
        period: string,
        isQuarterlyModule: boolean
    ): FutureData<GlassDataSubmission> {
        //Fix : Make sure that module, orgUnit and period are non empty before save.
        if (module !== "" && orgUnit !== "" && period) {
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
                    else {
                        //Adding a validation, that the datasubmission created is of correct period type - YEARLY/QUARTERLY
                        const isValidPeriod = this.validatePeriod(module, period, isQuarterlyModule);
                        const isValidModule = this.validateModule(module);
                        if (isValidPeriod && isValidModule) {
                            const defaultDataSubmission: GlassDataSubmission = {
                                id: generateId(),
                                module: module,
                                orgUnit: orgUnit,
                                period: period,
                                status: "NOT_COMPLETED",
                                statusHistory: [{ to: "NOT_COMPLETED", changedAt: new Date().toISOString() }],
                            };
                            return this.glassDataSubmissionRepository.save(defaultDataSubmission).flatMap(() => {
                                return Future.success(defaultDataSubmission);
                            });
                        } else return Future.error("Cannot find data submission");
                    }
                });
        } else {
            return Future.error("Cannot find data submission");
        }
    }

    private validatePeriod(module: string, period: string, isQuarterlyModule: boolean): boolean {
        if (isQuarterlyModule && period.includes("Q")) return true;
        else if (!isQuarterlyModule && !period.includes("Q")) return true;
        else {
            console.debug(`Tried to create an incorrect DS module : ${module} and period : ${period}`);
            return false;
        }
    }

    private validateModule(module: string): boolean {
        return moduleProperties.has(module);
    }
}
