import React, { useEffect, useState } from "react";
import { Button, Checkbox, FormControlLabel } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NonBlockingWarnings } from "./NonBlockingWarnings";
import sampleCharts from "../../assets/sample-charts.png";
import i18n from "@eyeseetea/d2-ui-components/locales";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";

interface ReviewDataSummaryProps {
    changeStep: (step: number) => void;
}

export const ReviewDataSummary: React.FC<ReviewDataSummaryProps> = ({ changeStep }) => {
    const [fileType, setFileType] = useState<string>("ris");
    const [isValidated, setIsValidated] = useState(false);

    const [state, setState] = React.useState({
        checkedA: false,
        checkedB: false,
        checkedC: false,
        checkedD: false,
    });

    useEffect(() => {
        if (state.checkedA || 
            state.checkedB || 
            state.checkedC || 
            state.checkedD ) {
            setIsValidated(true);
        } else {
            setIsValidated(false);
        }
    }, [state])
    
    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    const handleCheckBox = (event: React.ChangeEvent<HTMLInputElement>) => {
        setState({ ...state, [event.target.name]: event.target.checked });
    };

    return (
        <ContentWrapper>
            <div className="toggles">
                <Button onClick={() => changeType("ris")} className={fileType === "ris" ? "current" : ""}>
                    RIS File
                </Button>
                <Button onClick={() => changeType("sample")} className={fileType === "sample" ? "current" : ""}>
                    Sample File
                </Button>
            </div>
            <Section className="summary">
                <h3>Summary</h3>
                <SectionCard className="wrong">
                    <ul>
                        <li>130 Subjects</li>
                        <li><b>First Sample</b> 1-20-2020</li>
                        <li><b>Last Sample</b> 1-20-2020</li>
                    </ul>
                </SectionCard>
            </Section>
            <Section className="filter">
                <h3>Filter by sample type</h3>
                <SectionCard className="wrong">
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={state.checkedA}
                                // eslint-disable-next-line no-console
                                onChange={handleCheckBox}
                                name="checkedA"
                                color="primary"
                            />
                        }
                        label="Blood"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={state.checkedB}
                                // eslint-disable-next-line no-console
                                onChange={handleCheckBox}
                                name="checkedB"
                                color="primary"
                            />
                        }
                        label="Genital"
                    />
                </SectionCard>
            </Section>
            <Section className="compare">
                <h3>Compare with data from previous submissions</h3>
                <SectionCard className="wrong">
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={state.checkedC}
                                // eslint-disable-next-line no-console
                                onChange={handleCheckBox}
                                name="checkedC"
                                color="primary"
                            />
                        }
                        label="2020"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={state.checkedD}
                                // eslint-disable-next-line no-console
                                onChange={handleCheckBox}
                                name="checkedD"
                                color="primary"
                            />
                        }
                        label="2021"
                    />
                </SectionCard>
            </Section>
            <Section className="charts">
                <h3>Charts</h3>
                <SectionCard className="wrong">
                    <img src={sampleCharts} alt="Sample Charts" />
                    {/* <h3>All required charts to load here...</h3> */}
                </SectionCard>
            </Section>
            <div className="bottom">
                <Button variant="contained" color={isValidated ? 'primary' : 'default'}
                    disabled={isValidated ? false : true}
                    endIcon={<ChevronRightIcon />} 
                    onClick={() => changeStep(3)}
                    disableElevation>
                    
                    {i18n.t("Continue")}
                </Button>
            </div>
        </ContentWrapper>
    );
};


const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    .toggles {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        width: 100%;
        max-width: 550px;
        margin: 0 auto;
        button {
            color: ${glassColors.greyDisabled};
            padding: 10px 20px;
            border-radius: 0;
            border: none;
            flex: 1;
            border-bottom: 2px solid ${glassColors.greyLight};
            &.current {
                color: ${glassColors.mainPrimary};
                border-bottom: 4px solid ${glassColors.mainPrimary};
            }
        }
    }
    .bottom {
        display: flex;
        align-items: baseline;
        justify-content: center;
        margin: 0 auto 30px auto;
        align-items: flex-end;
        width: 100%;
    }
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    h3 {
        margin: 0;
        font-size: 21px;
        font-weight: 500;
    }
    &.charts {
        img {
            display: block;
            width: 100%;
        }
    }
`;
const SectionCard = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
    ul {
        margin: 0;
        padding: 0;
        display: flex;
        gap: 20px;
        list-style-type: none;
        li {
            display: inline-block;
        }
    }
`
