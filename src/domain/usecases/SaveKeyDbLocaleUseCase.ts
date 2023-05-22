import { FutureData } from "../entities/Future";
import { UsersRepository } from "../repositories/UsersRepository";

export class SaveKeyDbLocaleUseCase {
    constructor(private usersRepository: UsersRepository) {}

    execute(keyDbLocale: string): FutureData<void | unknown> {
        return this.usersRepository.saveLocale(false, keyDbLocale);
    }
}
