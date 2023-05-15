import { useEffect, FC, useState } from "react";
import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import { UserAccessInfo } from "../../../domain/entities/User";
import { MenuItem, Select } from "@material-ui/core";
import { useAppContext } from "../../contexts/app-context";
import { LocalesType } from "../../../domain/usecases/GetDatabaseLocalesUseCase";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

interface UserSettingsContentProps {
    userInformation: UserAccessInfo;
}

const booleanOptions: { label: string; value: string }[] = [
    { label: "YES", value: "true" },
    { label: "NO", value: "false" },
];

export const UserSettingsContent: FC<UserSettingsContentProps> = ({ userInformation }) => {
    const { compositionRoot } = useAppContext();
    const [databaseLocalesOptions, setDatabaseLocalesOptions] = useState<LocalesType>([]);
    const [uiLocalesOptions, setUiLocalesOptions] = useState<LocalesType>([]);
    const snackbar = useSnackbar();

    useEffect(() => {
        compositionRoot.locales.getDatabaseLocales().run(
            locales => {
                setDatabaseLocalesOptions(locales);
            },
            () => {
                snackbar.error(i18n.t("Error fetching Database locales"));
            }
        );
        compositionRoot.locales.getUiLocales().run(
            locales => {
                setUiLocalesOptions(locales);
            },
            () => {
                snackbar.error(i18n.t("Error fetching UI locales"));
            }
        );
    }, [compositionRoot.locales, snackbar]);

    return (
        <ContentWrapper>
            <CustomCard title="User Settings">
                <InfoTable>
                    <tbody>
                        <tr>
                            <td>{i18n.t("Interface language")}</td>
                            <td>
                                <Select
                                    defaultValue={userInformation.settings.keyUiLocale}
                                    MenuProps={{ disableScrollLock: true }}
                                    disabled
                                >
                                    {uiLocalesOptions.map(option => (
                                        <MenuItem key={option.locale} value={option.locale}>
                                            {option.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Database language")}</td>
                            <td>
                                <Select
                                    defaultValue={userInformation.settings.keyDbLocale}
                                    MenuProps={{ disableScrollLock: true }}
                                    disabled
                                >
                                    {databaseLocalesOptions.map(option => (
                                        <MenuItem key={option.locale} value={option.locale}>
                                            {option.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Enable message email notifications")}</td>
                            <td>
                                <Select
                                    defaultValue={userInformation.settings.keyMessageEmailNotification}
                                    MenuProps={{ disableScrollLock: true }}
                                    disabled
                                >
                                    {booleanOptions.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </td>
                        </tr>
                        <tr>
                            <td>{i18n.t("Enable message SMS notifications")}</td>
                            <td>
                                <Select
                                    defaultValue={userInformation.settings.keyMessageSmsNotification}
                                    MenuProps={{ disableScrollLock: true }}
                                    disabled
                                >
                                    {booleanOptions.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
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
    display: flex;
    justify-content: center;
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
