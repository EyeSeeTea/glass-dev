import React from "react";
import { Grid } from "@material-ui/core";
import { CustomCard } from "../custom-card/CustomCard";

export const DataSubmissionContent: React.FC = () => {
    return (
        <CustomCard>
            <Grid container spacing={10}>
                <h3>Data Submission Content here...</h3>
                <Grid item md={6} xs={12}>
                    <p>Lorem ipsum...</p>
                </Grid>
                <Grid item md={6} xs={12}>
                <p>Lorem ipsum dolor...</p>
                </Grid>
            </Grid>
        </CustomCard>
    );
};
