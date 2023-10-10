import { MenuItem, Select } from "@material-ui/core";
import React, { useState } from "react";
import i18n from "../../../locales";
import SearchInput from "./SearchInput";
import styled from "styled-components";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useAppContext } from "../../contexts/app-context";
import { OrgUnitAccess } from "../../../domain/entities/User";
interface OrgUnitProps {
    fullWidth?: boolean;
}

export const OrgUnitSelector: React.FC<OrgUnitProps> = React.memo(() => {
    const { currentOrgUnitAccess, changeCurrentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentUser } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOrgUnits, setFilteredOrgUnits] = useState(currentUser.userOrgUnitsAccess);

    const changeOrgUnit = (e: React.ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
        if (e.target?.value) {
            const updatedOrgUnitShortName = e.target.value as string;
            const updatedOrgUnit = currentUser.userOrgUnitsAccess.filter(
                ou => ou.orgUnitShortName === updatedOrgUnitShortName
            );

            if (updatedOrgUnit && updatedOrgUnit[0]) {
                const orgUnitId = updatedOrgUnit[0].orgUnitId;
                changeCurrentOrgUnitAccess(orgUnitId);
            }
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setFilteredOrgUnits(currentUser.userOrgUnitsAccess);
    };

    const handleOpen = () => {
        setIsOpen(true);
    };

    const updateSearchTerms = (searchStr: string) => {
        if (searchStr) {
            const filteredOUsBySearch = currentUser.userOrgUnitsAccess.filter(orgUnit =>
                orgUnit.orgUnitShortName.toLowerCase().includes(searchStr.toLowerCase())
            );
            setFilteredOrgUnits(filteredOUsBySearch);
        } else {
            setFilteredOrgUnits(currentUser.userOrgUnitsAccess);
        }
    };

    const renderMenuItem = (orgUnit: OrgUnitAccess) => {
        return (
            <StyledMenuItem key={orgUnit.orgUnitShortName} value={orgUnit.orgUnitShortName}>
                {i18n.t(orgUnit.orgUnitShortName)}
            </StyledMenuItem>
        );
    };

    return (
        currentUser.userOrgUnitsAccess && (
            <>
                <StyledSelect
                    value={currentOrgUnitAccess.orgUnitShortName}
                    onChange={changeOrgUnit}
                    disableUnderline
                    MenuProps={{
                        autoFocus: false,
                        MenuListProps: { disablePadding: true },
                        disableScrollLock: true,
                    }}
                    open={isOpen}
                    onOpen={handleOpen}
                    onClose={handleClose}
                >
                    <SearchInputContainer>
                        <StyledSearchInput onTermChange={updateSearchTerms} />
                    </SearchInputContainer>

                    {filteredOrgUnits.length > 0 ? (
                        filteredOrgUnits.map(renderMenuItem)
                    ) : (
                        <StyledMenuItem disabled>{i18n.t("No Organisation Units found")}</StyledMenuItem>
                    )}
                </StyledSelect>
            </>
        )
    );
});

const SearchInputContainer = styled.div`
    z-index: 200;
    width: 322px;
    height: 70px;
    background-color: white;
`;

const StyledSearchInput = styled(SearchInput)`
    height: 20px;
    border: 1px solid #cfe9f7;
    border-radius: 20px;
    width: 250px;

    margin: 10px 10px 0px 10px;
    z-index: 10;
`;

const StyledMenuItem = styled(MenuItem)`
    width: 300px;
`;

const StyledSelect = styled(Select)`
    max-height: 400px;
    background-color: white;
`;
