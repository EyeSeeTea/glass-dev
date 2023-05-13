export type Color = string;
export interface ThemeStyle {
    text?: string;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontColor?: Color;
    fillColor?: Color;
    wrapText?: boolean;
    horizontalAlignment?: "left" | "center" | "right" | "fill" | "centerContinuous" | "distributed";
    verticalAlignment?: "top" | "center" | "bottom" | "justify" | "distributed";
    border?: boolean;
    borderColor?: Color;
    rowSize?: number;
    columnSize?: number;
    merged?: boolean;
    locked?: boolean;
}
