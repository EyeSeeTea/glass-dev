import i18n from "@eyeseetea/d2-ui-components/locales";
import moment from "moment";
import styled from "styled-components";
import { CountryInformation } from "../../../domain/entities/CountryInformation";
import { CustomCard } from "../custom-card/CustomCard";

interface CountryInformationContentProps {
    countryInformation: CountryInformation;
}

export const CountryInformationContent: React.FC<CountryInformationContentProps> = ({ countryInformation }) => {
    return (
        <ContentWrapper>
            <CustomCard title="Country Identification">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td>{i18n.t("WHO Region")}</td>
                            <td>{countryInformation.WHORegion}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Country")}</td>
                            <td>{countryInformation.country}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Year")}</td>
                            <td>{countryInformation.year}</td>
                        </tr>
                    </tbody>
                </InfoTable>
            </CustomCard>

            <CustomCard title="Enrolment Information">
                <InfoTable>
                    {countryInformation.enrolmentStatus && countryInformation.enrolmentDate && (
                        <tbody>
                            <tr>
                                <td>{i18n.t("Enrolment status")}</td>
                                <td>{countryInformation.enrolmentStatus}</td>
                            </tr>
                            <tr>
                                <td>{i18n.t("Date of Enrolment")}</td>
                                {<td>{moment(countryInformation.enrolmentDate).format("MM/DD/YYYY")}</td>}
                            </tr>
                        </tbody>
                    )}
                </InfoTable>
            </CustomCard>

            {countryInformation.nationalFocalPoints.map(nationalFocalPoint => {
                return (
                    <CustomCard title="National Focal Point" key={nationalFocalPoint.id}>
                        <InfoTable>
                            <tbody>
                                {nationalFocalPoint.values.map(value => {
                                    return (
                                        <tr key={value.id}>
                                            <td>{`${value.name} *`}</td>
                                            <td>{value.value}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </InfoTable>
                    </CustomCard>
                );
            })}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    max-width: 800px;
    p.intro {
        text-align: left;
        max-width: 730px;
        margin: 0 auto;
        font-weight: 300px;
        line-height: 1.4;
    }
`;

const InfoTable = styled.table`
    border: none;
    margin: 20px;
    tr {
        td {
            padding: 5px;
        }
        td:nth-child(1) {
            text-align: right;
        }
        td:nth-child(2) {
            font-weight: 600;
        }
    }
`;
