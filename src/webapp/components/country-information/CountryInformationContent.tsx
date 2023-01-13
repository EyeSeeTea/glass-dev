import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";

// TODO: refactor InfoTable content to json object format and parse rows
export const CountryInformationContent: React.FC = () => {
    return (
        <ContentWrapper>
            <CustomCard title="Country Identification">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td>WHO Region</td>
                            <td>WHO African Region</td>
                        </tr>
                        <tr>
                            <td>Country</td>
                            <td>Algeria</td>
                        </tr>
                        <tr>
                            <td>Year</td>
                            <td>2021</td>
                        </tr>
                    </tbody>
                </InfoTable>
            </CustomCard>

            <CustomCard title="Enrolment Information">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td>Enrolment status</td>
                            <td>Yes</td>
                        </tr>
                        <tr>
                            <td>Date of Enrolment</td>
                            <td>11/06/2019</td>
                        </tr>
                    </tbody>
                </InfoTable>
            </CustomCard>

            <CustomCard title="National Focal Point">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td>Family Name *</td>
                            <td>Lorem</td>
                        </tr>
                        <tr>
                            <td>First Name *</td>
                            <td>Ipsum</td>
                        </tr>
                        <tr>
                            <td>Function *</td>
                            <td>Dolor sit amet</td>
                        </tr>
                        <tr>
                            <td>Email Address *</td>
                            <td>loremipsum@gmail.com</td>
                        </tr>
                        <tr>
                            <td>Preferred Language (notifications) *</td>
                            <td>English</td>
                        </tr>
                    </tbody>
                </InfoTable>
            </CustomCard>
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
