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
    // const ref = useRef<HTMLInputElement>(null);
    // useEffect(() => updateStateValue(value), [value]);

    // const onChangeDebounced = useCallback(
    //     _.debounce((value: string) => {
    //         if (onChange) {
    //             onChange(value);
    //         }
    //     }, 400),
    //     [onChange]
    // );

    // const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     const targetValue = event.target.value;
    //     onChangeDebounced(targetValue);
    //     event.stopPropagation();
    //     // setSearchInput(targetValue);
    // };

    const updateSearchString = (event: React.ChangeEvent<HTMLInputElement>) => {
        const targetValue = event.target.value;
        onTermChange(targetValue);
        // setSearchInput(targetValue);
    };

    const handleKeydown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
    }, []);

    return (
        <Paper className={clsx(classes.root, className)} style={style} elevation={0} role="search">
            <SearchIcon className={classes.icon} htmlColor="black" />
            <Input
                className={classes.input}
                // inputRef={ref}
                disableUnderline
                onChange={updateSearchString}
                placeholder={i18n.t("Search")}
                // value={searchInput}
                role="searchbox"
                onKeyDown={handleKeydown}
                onClick={e => {
                    e.stopPropagation();
                    // ref.current?.focus();
                }}
            />
        </Paper>
    );
};

export default SearchInput;
