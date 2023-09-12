import React, { useState } from "react";
import { Breadcrumbs, Button } from "@material-ui/core";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { glassColors, palette } from "../app/themes/dhis2.theme";

import { NewSignalForm } from "../../components/new-signal/NewSignalForm";

export const NewSignalPage: React.FC = () => {
    const { currentModuleAccess } = useCurrentModuleContext();

    const [formVisibility, setFormVisibility] = useState<boolean>(false);

    const showForm = () => {
        setFormVisibility(true);
    };

    const hideForm = () => {
        setFormVisibility(false);
    };

    return (
        <ContentWrapper>
            <PreContent>
                <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                    <Button component={NavLink} to={`/new-signal`} exact={true}>
                        <span>{currentModuleAccess.moduleName}</span>
                    </Button>
                    <ChevronRightIcon />
                    <Button component={NavLink} to={`new-signal`} exact={true}>
                        <span>{i18n.t(`New Signal`)}</span>
                    </Button>
                </StyledBreadCrumbs>
            </PreContent>
            {!formVisibility && (
                <CenteredDiv>
                    <Button variant="contained" color="primary" onClick={showForm}>
                        {i18n.t("Draft New Signal")}
                    </Button>
                </CenteredDiv>
            )}
            {formVisibility && <NewSignalForm hideForm={hideForm} readonly={false} />}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const PreContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    .info {
        font-size: 14px;
        span {
            opacity: 0.5;
        }
        span:nth-child(1) {
            color: ${glassColors.green};
            opacity: 1;
        }
    }
`;

const StyledBreadCrumbs = styled(Breadcrumbs)`
    color: ${glassColors.mainPrimary};
    font-weight: 400;
    text-transform: uppercase;
    li {
        display: flex;
        align-items: center;
        p {
            padding: 6px 8px;
        }
        .MuiButton-root {
            span {
                color: ${glassColors.mainPrimary};
                font-size: 15px;
            }
        }
    }
    .MuiBreadcrumbs-separator {
        display: none;
    }
    svg {
        color: ${palette.text.secondary};
    }
`;
const CenteredDiv = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;
