import React from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { Signal } from "../../domain/entities/Signal";
import { useCurrentUserGroupsAccess } from "./useCurrentUserGroupsAccess";

export type SignalsState = GlassState<Signal[]>;

export function useSignals() {
    const { compositionRoot } = useAppContext();
    const [signals, setSignals] = React.useState<SignalsState>({
        kind: "loading",
    });
    const { readAccessGroup, confidentialAccessGroup } = useCurrentUserGroupsAccess();
    const { currentUser } = useAppContext();

    React.useEffect(() => {
        compositionRoot.signals.getSignals().run(
            signals => {
                if (confidentialAccessGroup.kind === "loaded" && readAccessGroup.kind === "loaded") {
                    //1. If the user has confidential user group access, show all signals.
                    if (currentUser.userGroups.some(ug => confidentialAccessGroup.data.find(cag => cag.id === ug.id))) {
                        const accessibleSignals = _.compact(
                            signals.map(signal => {
                                if (
                                    currentUser.userOrgUnitsAccess.some(
                                        ou => signal.orgUnit.id === ou.orgUnitId && ou.readAccess === true
                                    )
                                ) {
                                    return signal;
                                }
                            })
                        );
                        setSignals({ kind: "loaded", data: accessibleSignals });
                    }
                    //2. else if user is member of readAccess usergroup for the module and read access to orgUnit
                    else if (currentUser.userGroups.some(ug => readAccessGroup.data.find(cag => cag.id === ug.id))) {
                        const approvedSignals = signals.filter(signal => signal.status === "APPROVED");
                        setSignals({ kind: "loaded", data: approvedSignals });
                    } else {
                        setSignals({ kind: "loaded", data: [] });
                    }
                }
            },
            error => setSignals({ kind: "error", message: error })
        );
    }, [
        compositionRoot,
        confidentialAccessGroup,
        readAccessGroup,
        currentUser.userGroups,
        currentUser.userOrgUnitsAccess,
    ]);

    return signals;
}
