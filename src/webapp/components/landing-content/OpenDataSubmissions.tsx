import React from "react";
import { Grid } from "@material-ui/core";
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
            <Grid item xs={12}>
                <h2 className="section-title">Open Data Submissions</h2>
            </Grid>
            {openDataSubmissions.kind === "loaded" && openDataSubmissions.data.length ? (
                openDataSubmissions.data.map(openDataSubmission => (
                    <Grid item xs={6} key={openDataSubmission.id}>
                        <ModuleCard moduleId={openDataSubmission.module} period={openDataSubmission.period} />
                    </Grid>
                ))
            ) : (
                <StyledNoData>{i18n.t("No Open Data Submissions ...")}</StyledNoData>
            )}
        </ContentLoader>
    );
};

const StyledNoData = styled.p`
    padding-left: 20px;
`;
