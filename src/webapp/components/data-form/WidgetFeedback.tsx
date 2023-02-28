import React from "react";
import { CSSProperties } from "react";

export type WidgetState = "original" | "saving" | "saveSuccessful" | "saveError";

const baseStyles: CSSProperties = {
    transition: "background-color 0.5s",
    padding: 2,
};

const widgetFeedbackStylesByState: Record<WidgetState, CSSProperties> = {
    original: { ...baseStyles, backgroundColor: "" },
    saving: { ...baseStyles, backgroundColor: "yellow" },
    saveSuccessful: { ...baseStyles, backgroundColor: "rgb(185, 255, 185)" },
    saveError: { ...baseStyles, backgroundColor: "red" },
};

export const WidgetFeedback: React.FC<{ state: WidgetState }> = React.memo(props => {
    return <div style={widgetFeedbackStylesByState[props.state]}>{props.children}</div>;
});
