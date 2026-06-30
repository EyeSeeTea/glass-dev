export interface InstanceData {
    url: string;
    username?: string;
    password?: string;
    token?: string;
}

export class Instance {
    public readonly url: string;
    public readonly token: string | undefined;
    private username: string | undefined;
    private password: string | undefined;

    constructor(data: InstanceData) {
        this.url = data.url;
        this.username = data.username;
        this.password = data.password;
        this.token = data.token;
    }

    public get auth(): { username: string; password: string } | undefined {
        return this.username && this.password ? { username: this.username, password: this.password } : undefined;
    }
}
