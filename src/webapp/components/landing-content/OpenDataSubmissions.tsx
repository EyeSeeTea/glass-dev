import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useOpenDataSubmissionsByOrgUnit } from "../../hooks/useOpenDataSubmissionsByOrgUnit";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useAppContext } from "../../contexts/app-context";
import { ContentLoader } from "../content-loader/ContentLoader";
import styled from "styled-components";
import { useGlassModules } from "../../hooks/useGlassModules";

export const OpenDataSubmissions: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const modules = useGlassModules(compositionRoot);
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
            <ContentLoader content={modules}>
                {openDataSubmissions.kind === "loaded" &&
                modules.kind === "loaded" &&
                openDataSubmissions.data.length ? (
                    openDataSubmissions.data.map(openDataSubmission => {
                        const cardModule = modules.data.find(m => m.id === openDataSubmission.module);
                        return (
                            <Grid item xs={6} key={openDataSubmission.id}>
                                {cardModule && <ModuleCard period={openDataSubmission.period} module={cardModule} />}
                            </Grid>
                        );
                    })
                ) : (
                    <StyledNoData>{i18n.t("No Open Data Submissions")}</StyledNoData>
                )}
            </ContentLoader>
        </ContentLoader>
    );
};

const StyledNoData = styled(Typography)`
    padding-left: 20px;
`;
