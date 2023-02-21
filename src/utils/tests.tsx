import { render, RenderResult } from "@testing-library/react";
import { SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { ReactNode } from "react";
import { getCompositionRoot } from "../CompositionRoot";
import { getMockApi } from "../types/d2-api";
import { AppContext, AppContextState } from "../webapp/contexts/app-context";
import { Instance } from "../data/entities/Instance";
import { UserAccessInfo } from "../domain/entities/User";
import { Future } from "../domain/entities/Future";

export function getTestUser(): UserAccessInfo {
    return {
        id: "xE7jOejl9FI",
        name: "John Traore",
        username: "admin",
        userGroups: [],
        userRoles: [],
        userOrgUnitsAccess: [],
    };
}

export function getTestConfig() {
    return {};
}

export function getTestD2() {
    return {};
}

export function getTestContext() {
    // Mock api was working with axios but not with fetch
    const { api } = getMockApi();
    const instance = new Instance({ url: "http://localhost:8080" });
    const context = {
        api: api,
        d2: getTestD2(),
        currentUser: getTestUser(),
        config: getTestConfig(),
        compositionRoot: getCompositionRoot(instance),
    };

    return { api, context };
}

export function getReactComponent(children: ReactNode, context: AppContextState): RenderResult {
    return render(
        <AppContext.Provider value={context}>
            <SnackbarProvider>{children}</SnackbarProvider>
        </AppContext.Provider>
    );
}
