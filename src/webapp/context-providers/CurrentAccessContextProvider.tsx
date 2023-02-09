import { useEffect, useState } from "react";
import { getUrlParam } from "../utils/helpers";
import { defaultGlassContextState, CurrentAccessContext } from "../contexts/current-access-context";
import { OrgUnitAccess } from "../../domain/entities/User";
import { useHistory, useLocation } from "react-router-dom";

export const UserAccessContextProvider: React.FC = ({ children }) => {
    const [module, setModule] = useState<string>(defaultGlassContextState.module);
    const [currentOrgUnitAccess, setCurrentOrgUnitAccess] = useState<OrgUnitAccess>(
        defaultGlassContextState.currentOrgUnitAccess
    );
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    const history = useHistory();

    const changeCurrentOrgUnitAccess = (updated: OrgUnitAccess) => {
        setCurrentOrgUnitAccess(updated);
        if (queryParameters.get("orgUnit")) {
            queryParameters.set("orgUnit", updated.id);
            history.push({ search: queryParameters.toString() });
        }
    };

    useEffect(() => {
        const module = getUrlParam("module");
        setModule(module);
    }, []);

    return (
        <CurrentAccessContext.Provider
            value={{
                module,
                currentOrgUnitAccess,
                setModule,
                changeCurrentOrgUnitAccess,
            }}
        >
            {children}
        </CurrentAccessContext.Provider>
    );
};
