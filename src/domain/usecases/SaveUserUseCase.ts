import { FutureData } from "../entities/Future";
import { UsersRepository } from "../repositories/UsersRepository";

export class SaveUserUseCase {
    constructor(private usersRepository: UsersRepository) {}

    execute(password: string): FutureData<void | unknown> {
        return this.usersRepository.save(password);
    }
}
