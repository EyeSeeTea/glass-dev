import React, { useCallback } from "react";
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

    const getSignalsByUserOUReadAccess = useCallback(
        (signals: Signal[]) => {
            return _.compact(
                signals.map(signal => {
                    if (
                        currentUser.userOrgUnitsAccess.some(
                            ou => signal.orgUnit.id === ou.orgUnitId && ou.readAccess === true
                        ) ||
                        signal.status === "APPROVED"
                    ) {
                        return signal;
                    }
                })
            );
        },
        [currentUser.userOrgUnitsAccess]
    );

    React.useEffect(() => {
        compositionRoot.signals.getSignals().run(
            signals => {
                if (confidentialAccessGroup.kind === "loaded" && readAccessGroup.kind === "loaded") {
                    //1. If the user has confidential user group access show:
                    //a. signals belonging to org units the user has read access for and
                    //b. signals with APPROVED status.
                    if (currentUser.userGroups.some(ug => confidentialAccessGroup.data.find(cag => cag.id === ug.id))) {
                        const accessibleSignals = getSignalsByUserOUReadAccess(signals);
                        setSignals({ kind: "loaded", data: accessibleSignals });
                    }
                    //2. If the user has read usergroup access, show all approved signals.
                    else if (currentUser.userGroups.some(ug => readAccessGroup.data.find(cag => cag.id === ug.id))) {
                        const approvedSignals = signals.filter(signal => signal.status === "APPROVED");
                        setSignals({ kind: "loaded", data: approvedSignals });
                    }
                    //3. If the user does not have either confidential or read access, show no signals.
                    else {
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
        getSignalsByUserOUReadAccess,
    ]);

    return signals;
}
