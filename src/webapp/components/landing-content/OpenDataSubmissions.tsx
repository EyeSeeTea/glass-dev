import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useOpenDataSubmissionsByOrgUnit } from "../../hooks/useOpenDataSubmissionsByOrgUnit";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useAppContext } from "../../contexts/app-context";
import { ContentLoader } from "../content-loader/ContentLoader";
import styled from "styled-components";

export const OpenDataSubmissions: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const orgUnit = useCurrentOrgUnitContext();

    const openDataSubmissions = useOpenDataSubmissionsByOrgUnit(
        compositionRoot,
        orgUnit.currentOrgUnitAccess.orgUnitId
    );

    return (
        <ContentLoader content={openDataSubmissions}>
            {openDataSubmissions.kind === "loaded" && openDataSubmissions.data.length ? (
                <>
                    <Grid item xs={12}>
                        <h2 className="section-title">Open Data Submissions</h2>
                    </Grid>
                    {openDataSubmissions.data.map(data => {
                        return (
                            <Grid item xs={6} key={data.dataSubmission.id}>
                                {data.module && <ModuleCard period={data.dataSubmission.period} module={data.module} />}
                            </Grid>
                        );
                    })}
                </>
            ) : (
                <StyledNoData>{i18n.t("No Open Data Submissions")}</StyledNoData>
            )}
        </ContentLoader>
    );
};

const StyledNoData = styled(Typography)`
    padding-left: 20px;
    padding-top: 20px;
`;
