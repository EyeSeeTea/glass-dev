import { FutureData } from "../entities/Future";
import { UsersRepository } from "../repositories/UsersRepository";

export class SavePasswordUseCase {
    constructor(private usersRepository: UsersRepository) {}

    execute(password: string): FutureData<void | unknown> {
        return this.usersRepository.savePassword(password);
    }
}
