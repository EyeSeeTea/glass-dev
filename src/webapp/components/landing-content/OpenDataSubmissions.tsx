import React from "react";
import { Grid } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";
import { data } from "./mock-open-data-submissions.json";
import i18n from "@eyeseetea/d2-ui-components/locales";

export const OpenDataSubmissions: React.FC = () => {
    return (
        <>
            <Grid item xs={12}>
                <h2 className="section-title">Open Data Submissions</h2>
            </Grid>
            {data.length ? (
                data.map(item => (
                    <Grid item xs={6} key={item.id}>
                        <ModuleCard
                            title={item.title}
                            filesUploaded={item.files_uploaded}
                            moduleColor={item.module_color}
                            endDays={item.end_in_days}
                            moduleUrl={item.moduleUrl}
                        />
                    </Grid>
                ))
            ) : (
                <p>{i18n.t("No Data loaded...")}</p>
            )}
        </>
    );
};
