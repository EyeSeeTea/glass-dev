//
/* eslint-disable no-underscore-dangle */

class SystemSettingsStore {
    set(settings) {
        this._systemSettings = settings;
    }

    get() {
        return this._systemSettings;
    }
}

export const systemSettingsStore = new SystemSettingsStore();
