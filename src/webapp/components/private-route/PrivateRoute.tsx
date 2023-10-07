import { useSnackbar } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";
import { useGlassReadAccess } from "../../hooks/useGlassReadAccess";
import { useSideBarModulesContext } from "../../contexts/sidebar-modules-context";

const CAPTURE_ACCESS_PAGES = ["/upload"];

export const PrivateRoute = ({ children, pathname }: { children: JSX.Element; pathname: string }) => {
    const hasReadAccess = useGlassReadAccess();
    const hasCaptureAccess = useGlassCaptureAccess();
    const history = useHistory();
    const snackbar = useSnackbar();
    const { accessibleModules } = useSideBarModulesContext();

    useEffect(() => {
        if (CAPTURE_ACCESS_PAGES.includes(pathname)) {
            if (hasCaptureAccess === false) {
                history.push("/");
                snackbar.warning(i18n.t("You don't have capture access to this page"));
            }
        } else {
            if (hasReadAccess === false && hasCaptureAccess === false) {
                history.push("/");
                snackbar.warning(i18n.t("You don't have read access to this page"));
            }
        }
    }, [accessibleModules, hasCaptureAccess, hasReadAccess, history, pathname, snackbar]);

    return <div>{children}</div>;
};
