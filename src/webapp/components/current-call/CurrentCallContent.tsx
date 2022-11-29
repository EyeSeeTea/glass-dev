import React from "react";
import { Grid } from "@material-ui/core";
import { CustomCard } from "../custom-card/CustomCard";
import { BaseDataFiles } from "../current-call/BaseDataFiles";
import { CountryQuestionnarie } from "../current-call/CountryQuestionnarie";
import { GlassModule } from "../../../domain/entities/GlassModule";

interface CurrentCallContentProps {
    module: GlassModule;
}


export const CurrentCallContent: React.FC<CurrentCallContentProps> = ({module}) => {
    return (
        <CustomCard>
            <Grid container spacing={10}>
                <Grid item md={6} xs={12}>
                    <BaseDataFiles module={module} />
                </Grid>
                <Grid item md={6} xs={12}>
                    <CountryQuestionnarie />
                </Grid>
            </Grid>
        </CustomCard>
    );
};
