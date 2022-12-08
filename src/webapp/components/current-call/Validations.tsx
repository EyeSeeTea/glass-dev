import React from "react";
import styled from "styled-components";
import { UploadsDataItemProps, UploadsTable } from "./UploadsTable";
import { data } from "./mock-tables-data.json";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { Button } from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";
import WarningIcon from "@material-ui/icons/Warning";

export const Validations: React.FC = () => {
    return (
        <ValidationsGrid>
            <ValidationCard>
                <div className="head">
                    <h3>Validation Alpha</h3>
                </div>
                <span className="status">no validation</span>
                <div className="buttons">
                    <Button>Report</Button>
                    <Button variant="contained" color="primary">
                        Run Validation
                    </Button>
                </div>
            </ValidationCard>
            <ValidationCard className="correct">
                <div className="head">
                    <h3>Validation Bravo</h3>
                </div>
                <span className="status correct">
                    <CheckIcon />
                    10 - 10 - 2020 VALIDATION CORRECT
                </span>
                <div className="buttons">
                    <Button>Report</Button>
                    <Button variant="contained" color="primary">
                        Re-run Validation
                    </Button>
                </div>
            </ValidationCard>
            <ValidationCard className="wrong">
                <div className="head">
                    <h3>Validation Charlie</h3>
                </div>
                <span className="status wrong">
                    <WarningIcon />
                    10 - 10 - 2021 VALIDATION wrong
                </span>
                <div className="buttons">
                    <Button>Report</Button>
                    <Button variant="contained" color="primary">
                        Re-run Validation
                    </Button>
                </div>
            </ValidationCard>
            <ValidationCard className="correct">
                <div className="head">
                    <h3>Validation Echo</h3>
                </div>
                <span className="status correct">
                    <CheckIcon />
                    09 - 12 - 2021 VALIDATION CORRECT
                </span>
                <div className="buttons">
                    <Button>Report</Button>
                    <Button variant="contained" color="primary">
                        Re-run Validation
                    </Button>
                </div>
            </ValidationCard>
        </ValidationsGrid>
    );
};

const ValidationsGrid = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 30px;
    .head {
        * {
            display: block;
        }
    }
    .mand {
        margin: 0 0 0 auto;
    }
    .status {
        width: 100%;
        text-transform: uppercase;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .buttons {
        margin: 20px 0 0 auto;
        display: flex;
        gap: 10px;
        Button {
            padding: 8px 16px;
        }
        Button:first-child {
            color: ${glassColors.mainTertiary};
        }
    }
`;

const ValidationCard = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    width: calc(50% - 60px);
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
    .mand {
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 500;
        color: ${glassColors.mainPrimary};
    }
    &.correct {
        svg {
            color: ${glassColors.green};
        }
        .buttons {
            button:last-child:not(:hover) {
                background-color: transparent;
                color: ${glassColors.mainPrimary};
                box-shadow: none;
                outline: none;
            }
        }
    }
    &.wrong {
        svg {
            color: ${glassColors.orange};
        }
    }
`;
