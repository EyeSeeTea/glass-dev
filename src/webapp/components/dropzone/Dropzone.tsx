import React, { useImperativeHandle, useRef } from "react";
import { DropzoneOptions, useDropzone } from "react-dropzone";

export interface DropzoneProps extends DropzoneOptions {
    children?: React.ReactNode;
    visible?: boolean;
}

export interface DropzoneRef {
    openDialog: () => void;
}

export const Dropzone = React.forwardRef((props: DropzoneProps, ref: React.ForwardedRef<DropzoneRef>) => {
    const childrenRef = useRef<HTMLDivElement>(null);
    const { getRootProps, getInputProps, open } = useDropzone({
        noClick: !props.visible,
        ...props,
    });

    useImperativeHandle(ref, () => ({
        openDialog() {
            open();
        },
    }));

    return (
        <div {...getRootProps()}>
            <input {...getInputProps()} />
            <div ref={childrenRef} style={{ display: "flex", alignItems: "center" }}>
                {props.children}
            </div>
        </div>
    );
});
