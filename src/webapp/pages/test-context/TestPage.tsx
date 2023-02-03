import { Button, Grid, TextField } from "@material-ui/core";
import React, { useState } from "react";
import styled from "styled-components";
import { MainLayout } from "../../components/main-layout/MainLayout";
import { useGlassModuleContext } from "../../contexts/glass-module-context";
import { useTestContext } from "../../contexts/test-context";

export const TestPage: React.FC = React.memo(() => {
    const [val, setVal] = useState<string[]>(["", ""]);
    const [val2, setVal2] = useState<string[]>(["", ""]);

    const { isDark, setIsDark, loaded, currentNavItem, setCurrentNavItem, setLoaded } = useTestContext();
    const { module, orgUnit, setModule, setOrgUnit } = useGlassModuleContext();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentNavItem({
            groupName: val[0] || "",
            name: val[1] || "",
        });
    };

    const submit2 = (e: React.FormEvent) => {
        e.preventDefault();
        setModule(val2[0] || "");
        setOrgUnit(val2[1] || "");
    };

    return (
        <MainLayout>
            <ContentWrapper>
                <p>loaded: {loaded.toString()}</p>
                <p>
                    currentNavItem: [&quot;{currentNavItem.groupName}&quot; , &quot;{currentNavItem.name}&quot;]
                </p>
                <p>module: {module}</p>
                <p>orgUnit: {orgUnit}</p>

                <Button variant="contained" color="secondary" onClick={() => setLoaded(!loaded)}>
                    Toggle Loaded
                </Button>
                <Button variant="contained" color="primary" onClick={() => setIsDark(!isDark)}>
                    Toggle Dark Header
                </Button>
                <hr />

                <Grid container spacing={4}>
                    <Grid item>
                        <form noValidate autoComplete="off">
                            <TextField
                                label="Group Name"
                                value={val[0]}
                                onChange={e => setVal([e.target.value, val[1] || ""])}
                            />
                            <TextField
                                label="Name"
                                value={val[1]}
                                onChange={e => setVal([val[0] || "", e.target.value])}
                            />
                            <Button variant="contained" onClick={submit}>
                                Submit
                            </Button>
                        </form>
                    </Grid>
                    <Grid item>
                        <form noValidate autoComplete="off">
                            <TextField
                                label="Module"
                                value={val2[0]}
                                onChange={e => setVal2([e.target.value, val2[1] || ""])}
                            />
                            <TextField
                                label="Org Unit"
                                value={val2[1]}
                                onChange={e => setVal2([val2[0] || "", e.target.value])}
                            />
                            <Button variant="contained" onClick={submit2}>
                                Submit
                            </Button>
                        </form>
                    </Grid>
                </Grid>
            </ContentWrapper>
        </MainLayout>
    );
});

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-self: flex-start;
    gap: 20px;
    form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    p {
        margin: 0;
    }
`;
