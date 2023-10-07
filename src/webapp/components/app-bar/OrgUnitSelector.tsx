import { MenuItem, Select } from "@material-ui/core";
import React, { useEffect, useState } from "react";
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
    const [searchTerm, setSearchTerm] = useState<string>("");
    // const [selectedOrgUnit, setSelectedOrgUnit] = React.useState<string>(currentOrgUnitAccess.orgUnitShortName);
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOrgUnits, setFilteredOrgUnits] = useState(currentUser.userOrgUnitsAccess);

    useEffect(() => {
        if (searchTerm) {
            const filteredOUsBySearch = currentUser.userOrgUnitsAccess.filter(orgUnit =>
                orgUnit.orgUnitShortName.toLowerCase().includes(searchTerm.toLowerCase())
            );
            // const defaultOrgUnit = filteredOUsBySearch[0]?.orgUnitShortName ?? "";
            // setSelectedOrgUnit(defaultOrgUnit);
            setFilteredOrgUnits(filteredOUsBySearch);
        } else {
            // setSelectedOrgUnit(currentOrgUnitAccess.orgUnitShortName);
            setFilteredOrgUnits(currentUser.userOrgUnitsAccess);
        }
    }, [searchTerm, currentUser.userOrgUnitsAccess, currentOrgUnitAccess.orgUnitShortName]);

    const changeOrgUnit = (e: React.ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
        if (e.target?.value) {
            // const updatedOrgUnitShortName = e.target.value as string;
            const orgUnitId = (e.currentTarget as HTMLInputElement).getAttribute("data-key");
            if (orgUnitId) changeCurrentOrgUnitAccess(orgUnitId);
            // const updatedOrgUnit = userOrgUnitsAccess.filter(ou => ou.orgUnitShortName === updatedOrgUnitShortName);
            // if (updatedOrgUnit && updatedOrgUnit[0]) {
            //     const orgUnitId = updatedOrgUnit[0].orgUnitId;
            //     const orgUnitName = updatedOrgUnit[0].orgUnitShortName;
            //     //There should be only one OU with selected name
            //     console.info("before changeCurrentOrgUnitAccess");
            //     console.info(userOrgUnitsAccess);
            //     changeCurrentOrgUnitAccess(orgUnitId);
            //     console.info("after changeCurrentOrgUnitAccess");
            //     console.info(userOrgUnitsAccess);
            //     // setSelectedOrgUnit(orgUnitName);
            // }
        }
        e.stopPropagation();
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm("");
        setFilteredOrgUnits(currentUser.userOrgUnitsAccess);
    };

    const handleOpen = () => {
        setIsOpen(true);
    };

    const renderMenuItem = (orgUnit: OrgUnitAccess) => {
        return (
            <StyledMenuItem
                key={orgUnit.orgUnitShortName}
                data-key={orgUnit.orgUnitId}
                value={orgUnit.orgUnitShortName}
            >
                {i18n.t(orgUnit.orgUnitShortName)}
            </StyledMenuItem>
        );
    };

    const updateSearchTerms = (searchStr: string) => {
        console.log("here");
        setSearchTerm(searchStr);
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
