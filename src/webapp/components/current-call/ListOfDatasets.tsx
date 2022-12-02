import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";
import { UploadsTables } from "./UploadsTables";

export const ListOfDatasets: React.FC = () => {
    return (
        <ContentWrapper>
            <UploadsTables />
            <UploadsTables />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
