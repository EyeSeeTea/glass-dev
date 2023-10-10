import React, { useCallback } from "react";
import clsx from "clsx";
import { makeStyles } from "@material-ui/styles";
import { Paper, Input } from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import i18n from "../../../locales";

const useStyles = makeStyles(() => ({
    root: {
        borderRadius: "20px",
        alignItems: "center",
        padding: "10px",
        display: "flex",
        flexBasis: 420,
        border: "1px solid #d6d3d3",
    },
    icon: {
        marginRight: "10px",
        color: "gray",
    },
    input: {
        flexGrow: 1,
        fontSize: "16px",
        lineHeight: "16px",
        letterSpacing: "-0.05px",
    },
}));

interface SearchInputProps {
    className?: string;
    onTermChange: (value: string) => void;
    style?: React.CSSProperties;
    autoFocus?: boolean;
    searchTerm?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ className, onTermChange, style }) => {
    const classes = useStyles();

    const onChangeDebounced = _.debounce((value: string) => {
        onTermChange(value);
    }, 400);
    const updateSearchString = (event: React.ChangeEvent<HTMLInputElement>) => {
        const targetValue = event.target.value;
        onChangeDebounced(targetValue);
    };

    const handleKeydown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
    }, []);

    return (
        <Paper className={clsx(classes.root, className)} style={style} elevation={0} role="search">
            <SearchIcon className={classes.icon} htmlColor="black" />
            <Input
                className={classes.input}
                disableUnderline
                onChange={updateSearchString}
                placeholder={i18n.t("Search")}
                role="searchbox"
                onKeyDown={handleKeydown}
                onClick={e => {
                    e.stopPropagation();
                }}
            />
        </Paper>
    );
};

export default SearchInput;
