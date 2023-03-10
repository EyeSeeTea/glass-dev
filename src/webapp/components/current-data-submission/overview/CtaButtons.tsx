import React from "react";
import { Button } from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { NavLink } from "react-router-dom";
import { CTAs } from "./StatusDetails";
import { useGlassCaptureAccess } from "../../../hooks/useGlassCaptureAccess";

export interface CtaButtonsProps {
    ctas: CTAs[];
    position?: "right";
}

export const CtaButtons: React.FC<CtaButtonsProps> = ({ ctas, position }) => {
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();
    const getCTAButton = (cta: CTAs) => {
        // TODO : Button click event handlers to be added as corresponding feature developed.
        switch (cta.label) {
            case "Upload dataset":
                return (
                    <Button
                        variant="contained"
                        color="primary"
                        component={NavLink}
                        to={cta.url}
                        exact={true}
                        disabled={!hasCurrentUserCaptureAccess}
                    >
                        {i18n.t(`${cta.label} >`)}
                    </Button>
                );
            default:
                return (
                    <Button
                        variant={cta.variant || "contained"}
                        color={cta.color || "primary"}
                        component={NavLink}
                        to={cta.url}
                        style={{ textTransform: "none", marginRight: `${position ? "0" : "20px"}` }}
                    >
                        {i18n.t(`${cta.label} >`)}
                    </Button>
                );
        }
    };

    return (
        <>
            {ctas.map(cta => {
                return getCTAButton(cta);
            })}
        </>
    );
};
