import styled from "styled-components";
import { useEffect } from "react";
import { CustomCard } from "../custom-card/CustomCard";
import { ContentLoader } from "../content-loader/ContentLoader";
import { TableContentWrapper } from "../data-file-history/DataFileTable";

import i18n from "@eyeseetea/d2-ui-components/locales";
import { StyledTableBody } from "../data-file-history/DataFileTableBody";
import { useSignals } from "../../hooks/useSignals";

import { Paper, Table, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";

export const SignalTableContent: React.FC = () => {
    const signals = useSignals();

    useEffect(() => {}, []);

    return (
        <ContentLoader content={signals}>
            <ContentWrapper>
                <CustomCard padding="20px 30px 20px">
                    {signals.kind === "loaded" && (
                        <TableContentWrapper>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>
                                                <Typography variant="caption">{i18n.t("Date")}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">{i18n.t("Country")}</Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="caption">
                                                    {i18n.t("Level of Confidentiality")}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="caption">{i18n.t("Status")}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    {signals && signals.data.length ? (
                                        <StyledTableBody>
                                            {signals.data.map(signal => (
                                                <TableRow key={signal.id}>
                                                    <TableCell>{signal.creationDate.split("T")?.at(0) || ""}</TableCell>
                                                    <TableCell>{signal.orgUnit.name}</TableCell>
                                                    <TableCell>{signal.levelOfConfidentiality}</TableCell>
                                                    <TableCell>{signal.status}</TableCell>
                                                </TableRow>
                                            ))}
                                        </StyledTableBody>
                                    ) : (
                                        <StyledTableBody>
                                            <TableRow>
                                                <TableCell>No data found...</TableCell>
                                            </TableRow>
                                        </StyledTableBody>
                                    )}
                                </Table>
                            </TableContainer>
                        </TableContentWrapper>
                    )}
                </CustomCard>
            </ContentWrapper>
        </ContentLoader>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    p.intro {
        text-align: left;
        max-width: 730px;
        margin: 0 auto;
        font-weight: 300px;
        line-height: 1.4;
    }
`;
