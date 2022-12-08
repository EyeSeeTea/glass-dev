import { Typography } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import { palette } from "../../pages/app/themes/dhis2.theme";

export const AppFooter: React.FC = () => {
    return (
        <Wrapper>
            <Typography variant="body2" gutterBottom style={{ color: palette.text.secondary }}>
                &copy; {new Date().getFullYear()} Lorem ipsum dolor sit amet, consectetur adipiscing elit.{" "}
            </Typography>
        </Wrapper>
    );
};

const Wrapper = styled.div`
    background-color: transparent;
    text-align: center;
    margin: 20px auto 0 auto;
    padding: 15px;
`;
