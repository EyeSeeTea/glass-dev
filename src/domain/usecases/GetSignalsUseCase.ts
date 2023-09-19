import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";

import { Signal } from "../entities/Signal";

import { SignalRepository } from "../repositories/SignalRepository";

export class GetSignalsUseCase implements UseCase {
    constructor(private signalRepository: SignalRepository) {}

    public execute(): FutureData<Signal[]> {
        return this.signalRepository.getAll();
    }
}
