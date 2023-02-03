import { Button, TextField } from "@material-ui/core";
import React, { useState } from "react";
import styled from "styled-components";
import { MainLayout } from "../../components/main-layout/MainLayout";
import { useTestContext } from "../../contexts/test-context";


export const TestPage: React.FC = React.memo(() => {
    const [val, setVal] = useState<string[]>(['', '']);

    const { loaded, currentNavItem, setCurrentNavItem, setLoaded } = useTestContext();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        console.debug(val);
        setCurrentNavItem({
            groupName: val[0]||'',
            name: val[1]||'',
        })
    };

    const toggle = () => {
        setLoaded(!loaded);
    }

    return (
        <MainLayout>
            <ContentWrapper>
                <h3>loaded: {loaded.toString()}</h3>
                <h3>currentNavItem: {currentNavItem.groupName} | {currentNavItem.name}</h3>
                
                <Button variant="contained" color="secondary" onClick={toggle}>Toggle Context Value</Button>
                <hr />
                <form noValidate autoComplete="off">
                    <TextField
                        label="Group Name"
                        value={val[0]}
                        onChange={(e) => setVal([e.target.value, val[1]||''])}
                    />
                    <TextField
                        label="Name"
                        value={val[1]}
                        onChange={(e) => setVal([val[0]||'', e.target.value])}
                    />
                    <Button variant="contained" onClick={submit}>
                        Submit
                    </Button>
                </form>
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
`;
