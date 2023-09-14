import { MenuItem, Select } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import i18n from "../../../locales";
import SearchInput from "./SearchInput";
import styled from "styled-components";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useAppContext } from "../../contexts/app-context";
interface OrgUnitProps {
    fullWidth?: boolean;
}

export const OrgUnitSelector: React.FC<OrgUnitProps> = React.memo(() => {
    const { currentOrgUnitAccess, changeCurrentOrgUnitAccess } = useCurrentOrgUnitContext();
    const {
        currentUser: { userOrgUnitsAccess },
    } = useAppContext();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [orgUnitName, setOrgUnitName] = React.useState(currentOrgUnitAccess.orgUnitName);
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOrgUnits, setFilteredOrgUnits] = useState(userOrgUnitsAccess);

    useEffect(() => {
        if (orgUnitName !== currentOrgUnitAccess.orgUnitName) {
            //if orgUnit has been changed manually in url
            setOrgUnitName(currentOrgUnitAccess.orgUnitName);
        }
    }, [currentOrgUnitAccess.orgUnitName, orgUnitName]);

    useEffect(() => {
        if (searchTerm) {
            setFilteredOrgUnits(
                userOrgUnitsAccess.filter(
                    orgUnit =>
                        orgUnit.orgUnitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        orgUnit.orgUnitShortName.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        } else {
            setFilteredOrgUnits(userOrgUnitsAccess);
        }
    }, [searchTerm, userOrgUnitsAccess]);

    const changeOrgUnit = (e: React.ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
        if (e.target?.value) setOrgUnitName(e.target?.value as string);
        const orgUnitId = (e.currentTarget as HTMLInputElement).getAttribute("data-key");
        if (orgUnitId) changeCurrentOrgUnitAccess(orgUnitId);
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm("");
        setFilteredOrgUnits(userOrgUnitsAccess);
    };

    const handleOpen = () => {
        setIsOpen(true);
    };

    return (
        userOrgUnitsAccess && (
            <>
                <Select
                    value={orgUnitName}
                    onChange={changeOrgUnit}
                    disableUnderline
                    style={{ maxHeight: "400px", backgroundColor: "white" }}
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
                        <StyledSearchInput value={searchTerm} onChange={term => setSearchTerm(term)} autoFocus />
                    </SearchInputContainer>
                    <br />
                    {filteredOrgUnits.length > 0 ? (
                        filteredOrgUnits.map((orgUnit, i) => (
                            <MenuItem
                                style={i === 0 ? { marginTop: "60px", minWidth: "300px" } : { minWidth: "300px" }}
                                key={orgUnit.orgUnitId}
                                data-key={orgUnit.orgUnitId}
                                value={orgUnit.orgUnitName}
                            >
                                {i18n.t(orgUnit.orgUnitShortName)}
                            </MenuItem>
                        ))
                    ) : (
                        <MenuItem disabled style={{ marginTop: "60px", minWidth: "300px" }}>
                            {i18n.t("No Organisation Units found")}
                        </MenuItem>
                    )}
                </Select>
            </>
        )
    );
});

const SearchInputContainer = styled.div`
    position: fixed;
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
    position: fixed;
    margin: 10px 10px 0px 10px;
    z-index: 10;
`;
