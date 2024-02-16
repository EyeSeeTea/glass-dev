import { Backdrop, CircularProgress, Typography } from "@material-ui/core";
import { StyledLoaderContainer } from "../upload/ConsistencyChecks";
import i18n from "../../../locales";

type LoadingBackdropProps = {
    isOpen: boolean;
};

export const DownloadingBackdrop: React.FC<LoadingBackdropProps> = ({ isOpen }) => {
    return (
        <Backdrop open={isOpen} style={{ color: "#fff", zIndex: 1 }}>
            <StyledLoaderContainer>
                <CircularProgress color="inherit" size={50} />
                <Typography variant="h6">{i18n.t("Downloading")}</Typography>
            </StyledLoaderContainer>
        </Backdrop>
    );
};
