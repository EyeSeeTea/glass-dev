import { FutureData } from "../entities/Future";
import { UsersRepository } from "../repositories/UsersRepository";

export class SaveKeyUiLocaleUseCase {
    constructor(private usersRepository: UsersRepository) {}

    execute(keyUiLocale: string): FutureData<void | unknown> {
        return this.usersRepository.saveLocale(true, keyUiLocale);
    }
}
