import { Id } from "@eyeseetea/d2-api";
import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";

import { Signal } from "../entities/Signal";

import { SignalRepository } from "../repositories/SignalRepository";

export class GetProgramQuestionnairesUseCase implements UseCase {
    constructor(private signalRepository: SignalRepository) {}

    public execute(currentOrgUnitId: Id): FutureData<Signal[]> {
        return this.signalRepository.getAll(currentOrgUnitId);
    }
}
