import React, { useCallback } from "react";
import { GlassState } from "./State";
import { useAppContext } from "../contexts/app-context";
import { Signal } from "../../domain/entities/Signal";
import { useCurrentUserGroupsAccess } from "./useCurrentUserGroupsAccess";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";

export type SignalsState = GlassState<Signal[]>;

export function useSignals() {
    const { compositionRoot } = useAppContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
    const [signals, setSignals] = React.useState<SignalsState>({
        kind: "loading",
    });
    const { readAccessGroup, confidentialAccessGroup } = useCurrentUserGroupsAccess();
    const { currentUser } = useAppContext();
    const [shouldRefreshSignals, refreshSignals] = React.useState({});

    const getSignalsByUserOUAccess = useCallback(
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

    const getNonConfidentailSignalsByUserOUAccess = useCallback(
        (signals: Signal[]) => {
            return signals.filter(
                signal =>
                    signal.status === "APPROVED" ||
                    (signal.status === "DRAFT" &&
                        currentUser.userOrgUnitsAccess.some(
                            ou => signal.orgUnit.id === ou.orgUnitId && ou.readAccess === true
                        ))
            );
        },
        [currentUser.userOrgUnitsAccess]
    );

    React.useEffect(() => {
        compositionRoot.programQuestionnaires.getList(orgUnitId).run(
            signals => {
                if (confidentialAccessGroup.kind === "loaded" && readAccessGroup.kind === "loaded") {
                    //1. If the user has confidential user group access show:
                    //a. signals belonging to org units the user has read access for and
                    //b. signals with APPROVED status.
                    if (currentUser.userGroups.some(ug => confidentialAccessGroup.data.find(cag => cag.id === ug.id))) {
                        const accessibleSignals = getSignalsByUserOUAccess(signals);
                        setSignals({ kind: "loaded", data: accessibleSignals });
                    }
                    //2. If the user has read usergroup access, show
                    //a. approved signals for all Org Units
                    //b. draft signals for Org Units user has read access to.
                    else if (currentUser.userGroups.some(ug => readAccessGroup.data.find(cag => cag.id === ug.id))) {
                        const approvedSignals = getNonConfidentailSignalsByUserOUAccess(signals);
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
        getSignalsByUserOUAccess,
        getNonConfidentailSignalsByUserOUAccess,
        shouldRefreshSignals,
        orgUnitId,
    ]);

    return { signals, setSignals, refreshSignals };
}
