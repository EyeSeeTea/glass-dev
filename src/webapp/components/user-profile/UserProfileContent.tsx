import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import { UserAccessInfo } from "../../../domain/entities/User";
import Chip from "@material-ui/core/Chip";

interface UserProfileContentProps {
    userInformation: UserAccessInfo;
}

export const UserProfileContent: React.FC<UserProfileContentProps> = ({ userInformation }) => {
    return (
        <ContentWrapper>
            <CustomCard title="User Profile">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td>{i18n.t("Full name")}</td>
                            <td>{userInformation.name}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Username")}</td>
                            <td>{userInformation.username}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Email")}</td>
                            <td>{userInformation.email}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Phone number")}</td>
                            <td>{userInformation.phoneNumber}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Birthday")}</td>
                            <td>{userInformation.birthday}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Nationality")}</td>
                            <td>{userInformation.nationality}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Job title")}</td>
                            <td>{userInformation.jobTitle}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Employer")}</td>
                            <td>{userInformation.employer}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Education")}</td>
                            <td>{userInformation.education}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Interests")}</td>
                            <td>{userInformation.interests}</td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Languages")}</td>
                            <td>{userInformation.languages}</td>
                        </tr>
                    </tbody>
                </InfoTable>
            </CustomCard>

            <CustomCard title="User Roles">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td style={{ textAlign: "left" }}>
                                {userInformation.userRoles.map(roles => (
                                    <StyledChip key={roles.id} label={roles.name} color="primary" size="small" />
                                ))}
                            </td>
                        </tr>
                    </tbody>
                </InfoTable>
            </CustomCard>

            <CustomCard title="User Organisation Units">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td style={{ textAlign: "left" }}>
                                {userInformation.userOrgUnitsAccess.map(orgUnits => (
                                    <StyledChip
                                        size="small"
                                        key={orgUnits.orgUnitId}
                                        label={orgUnits.orgUnitName}
                                        color="primary"
                                    />
                                ))}
                            </td>
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

const StyledChip = styled(Chip)`
    margin: 5px 1px;
`;
