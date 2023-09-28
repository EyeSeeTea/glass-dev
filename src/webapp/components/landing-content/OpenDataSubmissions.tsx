import React from "react";
import { Grid } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";
import { useOpenDataSubmissionsByOrgUnit } from "../../hooks/useOpenDataSubmissionsByOrgUnit";
import { ContentLoader } from "../content-loader/ContentLoader";

export const OpenDataSubmissions: React.FC = () => {
    const openDataSubmissions = useOpenDataSubmissionsByOrgUnit();

    return (
        <ContentLoader content={openDataSubmissions}>
            {openDataSubmissions.kind === "loaded" && openDataSubmissions.data.length > 0 && (
                <>
                    {openDataSubmissions.data.map(data => {
                        return (
                            data.dataSubmission &&
                            data.module && (
                                <Grid item xs={6} key={data.dataSubmission.id}>
                                    {data.module && (
                                        <ModuleCard period={data.dataSubmission.period} module={data.module} />
                                    )}
                                </Grid>
                            )
                        );
                    })}
                </>
            )}
        </ContentLoader>
    );
};
