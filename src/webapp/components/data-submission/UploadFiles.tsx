import React, { useState } from "react";
import { Button, FormControl, MenuItem, Select } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { data as previousSubmissions } from "./mock-previous-submissions.json";
import { UploadRis } from "./UploadRis";
import { UploadSample } from "./UploadSample";
interface UploadFilesProps {
    changeStep: (step: number) => void;
}

export const UploadFiles: React.FC<UploadFilesProps> = ({ changeStep }) => {
    const [batchId, setBatchId] = useState("1");
    const [isValidated, setIsValidated] = useState(false);

    const changeBatchId = (event: React.ChangeEvent<{ value: unknown }>) => {
        setBatchId(event.target.value as string);
    };

    const validate = (val: boolean) => {
        setIsValidated(val);
    };

    return (
        <ContentWrapper>
            <div className="file-fields">
                <UploadRis validate={validate} />

                <UploadSample />
            </div>

            <div className="batch-id">
                <h3>{i18n.t("Batch ID")}</h3>
                <FormControl variant="outlined">
                    <Select value={batchId} onChange={changeBatchId}>
                        {/* <MenuItem value="">
                            <em>None</em>
                        </MenuItem> */}
                        <MenuItem value={1}>{i18n.t("Dataset 1")}</MenuItem>
                        <MenuItem value={2}>{i18n.t("Dataset 2")}</MenuItem>
                        <MenuItem value={3}>{i18n.t("Dataset 3")}</MenuItem>
                    </Select>
                </FormControl>
            </div>

            <div className="bottom">
                <div className="previous-list">
                    <h4>{i18n.t("You Previously Submitted:")} </h4>
                    <ul>
                        {previousSubmissions.map((item, i) => (
                            <li key={i}>
                                {item.name} - {item.id}
                            </li>
                        ))}
                    </ul>
                </div>
                <Button
                    variant="contained"
                    color={isValidated ? "primary" : "default"}
                    disabled={isValidated ? false : true}
                    endIcon={<ChevronRightIcon />}
                    disableElevation
                    onClick={() => changeStep(2)}
                >
                    {i18n.t("Continue")}
                </Button>
            </div>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    justify-content: center;
    align-items: center;
    .file-fields {
        align-items: baseline;
        justify-content: center;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 50% 50%;
        width: 100%;
        > div:first-child {
            border-right: 1px solid ${glassColors.grey};
        }
        > div {
            padding: 30px 50px;
            display: block;
        }
        input {
            display: none;
        }
        .uploaded-list {
            list-style-type: none;
            margin: 15px 0 0 0;
            padding: 0;
            li {
                font-size: 14px;
                display: inline-flex;
                gap: 5px;
                .remove-files {
                    font-size: 13px;
                    cursor: pointer;
                    border: none;
                    background: none;
                    padding: 0;
                    color: ${glassColors.red};
                    svg {
                        width: 20px;
                        height: 20px;
                    }
                }
            }
        }
    }
    .label {
        font-weight: 400;
        margin-bottom: 15px;
        display: block;
        small {
            color: ${glassColors.grey};
        }
        svg {
            color: ${glassColors.mainPrimary};
            font-size: 15px;
            bottom: -3px;
            position: relative;
        }
    }
    .batch-id {
        h3 {
            font-size: 20px;
            font-weight: 600;
        }
    }
    .bottom {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin: 0 auto 30px auto;
        align-items: flex-end;
        width: 100%;
        .previous-list {
            ul {
                margin: 0;
                padding: 0 0 0 20px;
            }
        }
    }
`;
