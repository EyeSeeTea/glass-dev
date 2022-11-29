import React from "react";
import { Grid } from "@material-ui/core";
import { CustomCard } from "../custom-card/CustomCard";
import styled from "styled-components";

export const DataSubmissionContent: React.FC = () => {
    return (
        <CustomCard padding="40px">
            <Grid container spacing={10} direction={"column"}>
                <Grid item>
                    <h3>Data Submission Content here...</h3>
                    <p>Lorem ipsum...</p>
                </Grid>
                <Grid item md={6} xs={12}>
                    <p>Lorem ipsum dolor...</p>
                </Grid>
            </Grid>
        </CustomCard>
    );
};
