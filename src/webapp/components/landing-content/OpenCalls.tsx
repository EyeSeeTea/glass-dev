import React from "react";
import { Grid } from "@material-ui/core";
import { ModuleCard } from "../module-card/ModuleCard";

// TODO: use this json for testing only and pass actual calls to context
import { data } from "./open-calls-list.json";

export const OpenCalls: React.FC = () => {
    return (
        <>
            <Grid item xs={12}>
                <h2 className="section-title">Open Calls</h2>
            </Grid>
            {data.length ? (
                data.map((item, index) => (
                    <Grid item xs={6} key={index}>
                        <ModuleCard
                            title={item.title}
                            filesUploaded={item.files_uploaded}
                            moduleColor={item.module_color}
                            endDays={item.end_in_days}
                            moduleUrl={item.moduleUrl}
                            period={item.period}
                            status={item.status}
                        />
                    </Grid>
                ))
            ) : (
                <p>No Data loaded...</p>
            )}
        </>
    );
};
