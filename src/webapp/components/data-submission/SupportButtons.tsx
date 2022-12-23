import React, { useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { NavLink, useLocation } from "react-router-dom";

export const SupportButtons: React.FC = () => {
    const [isHidden, setIsHidden] = useState(false);

    // TODO: remove the next two lines and create a global hook to get current module
    const location = useLocation().pathname.slice(1);
    const moduleName = location.substring(location.indexOf("/") + 1);

    if (!isHidden) {
        return (
            <ContentWrapper>
                <div>
                    <span>{i18n.t("I need help")}</span>
                    <Button variant="contained" color="primary">
                        {i18n.t("Submit Help Ticket")}
                    </Button>
                </div>
                <div>
                    <span>{i18n.t("I can fix this by myself")}</span>
                    <Button
                        variant="contained"
                        color="primary"
                        component={NavLink}
                        to={`/data-submission/${moduleName}`}
                        exact={true}
                    >
                        {i18n.t("Upload New Data Files")}
                    </Button>
                </div>
                <div>
                    <span>{i18n.t("I'll fix it later")}</span>
                    <Button variant="contained" color="primary" onClick={() => setIsHidden(true)}>
                        {i18n.t("OK")}
                    </Button>
                </div>
            </ContentWrapper>
        );
    } else {
        return <></>;
    }
};

const ContentWrapper = styled.div`
    display: flex;
    gap: 20px;
    > div {
        display: flex;
        flex-direction: column;
        gap: 15px;
        button {
            font-weight: 400;
        }
    }
`;
