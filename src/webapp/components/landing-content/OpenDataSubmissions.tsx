import React from "react";
import { Grid } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";
import { useOpenDataSubmissionsByOrgUnit } from "../../hooks/useOpenDataSubmissionsByOrgUnit";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useAppContext } from "../../contexts/app-context";
import { ContentLoader } from "../content-loader/ContentLoader";

export const OpenDataSubmissions: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const orgUnit = useCurrentOrgUnitContext();

    const openDataSubmissions = useOpenDataSubmissionsByOrgUnit(
        compositionRoot,
        orgUnit.currentOrgUnitAccess.orgUnitId
    );

    return (
        <ContentLoader content={openDataSubmissions}>
            {openDataSubmissions.kind === "loaded" && openDataSubmissions.data.length > 0 && (
                <>
                    {openDataSubmissions.data.map(data => {
                        return (
                            <Grid item xs={6} key={data.dataSubmission.id}>
                                {data.module && <ModuleCard period={data.dataSubmission.period} module={data.module} />}
                            </Grid>
                        );
                    })}
                </>
            )}
        </ContentLoader>
    );
};
