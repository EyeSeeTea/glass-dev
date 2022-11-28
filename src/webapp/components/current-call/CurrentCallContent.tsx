import React from "react";
import { Grid } from "@material-ui/core";
import { CustomCard } from "../custom-card/CustomCard";
import { BaseDataFiles } from "./BaseDataFiles";
import { CountryQuestionnarie } from "./CountryQuestionnarie";

export const CurrentCallContent: React.FC = () => {
    return (
        <CustomCard>
            <Grid container spacing={10}>
                <Grid item md={6} xs={12}>
                    <BaseDataFiles />
                </Grid>
                <Grid item md={6} xs={12}>
                    <CountryQuestionnarie />
                </Grid>
            </Grid>
        </CustomCard>
    );
};
