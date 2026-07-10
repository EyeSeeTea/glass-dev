import i18n from "@eyeseetea/d2-ui-components/locales";
import { Typography } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import { palette } from "../../pages/app/themes/dhis2.theme";
import { getCurrentYear } from "../../../utils/currentPeriodHelper";
import { version } from "../../../../package.json";

export const AppFooter: React.FC = () => {
    return (
        <Wrapper>
            <Typography variant="body2" gutterBottom>
                <Link href="https://www.who.int/about/policies/privacy" target="_blank" style={{ marginRight: 20 }}>
                    {i18n.t("WHO privacy policy")}
                </Link>
                {" · "}
                <Link
                    href="https://cdn.who.int/media/docs/default-source/antimicrobial-resistance/hq-amr/glass-terms-of-use_2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginRight: 20 }}
                >
                    {i18n.t("Terms of Use")}
                </Link>
                {" · "}
                <Link href="https://www.who.int/about/policies/publishing/copyright" target="_blank">
                    {i18n.t(`©WHO ${getCurrentYear()}`)}
                </Link>
                <Muted>{` · v${version}`}</Muted>
            </Typography>
        </Wrapper>
    );
};

const Link = styled.a`
    color: ${palette.text.secondary};
    text-decoration: none;
    &:hover {
        color: ${palette.text.primary};
    }
`;

const Muted = styled.span`
    color: ${palette.text.secondary};
    margin-left: 8px;
`;

const Wrapper = styled.div`
    background-color: transparent;
    text-align: center;
    margin: 20px auto 0 auto;
    padding: 15px;
`;
