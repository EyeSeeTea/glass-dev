import React from "react";
import styled from "styled-components";
// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody, DataTableCell } from "@dhis2/ui";

import { FieldWidget } from "./FieldWidget";
import { FormFieldState } from "./presentation-entities/FormFieldsState";

type FormSectionProps = {
    id: string;
    title?: string;
    required?: boolean;
    fields: FormFieldState[];
    onUpdateField: (updatedField: FormFieldState) => void;
    errorLabels?: Record<string, string>;
};

export const FormSection: React.FC<FormSectionProps> = React.memo(({ title, fields, onUpdateField, errorLabels }) => {
    return (
        <DataTable>
            <TableHead>
                <DataTableRow>
                    <DataTableColumnHeader colSpan="2">
                        <span>{title}</span>
                    </DataTableColumnHeader>
                </DataTableRow>
            </TableHead>

            <TableBody>
                {fields.length && fields.some(f => f.isVisible)
                    ? fields.map(field => {
                          if (!field.isVisible) return null;
                          return (
                              <StyledDataTableRow key={field.id}>
                                  <DataTableCell width="60%">
                                      <StyledTextField required={field.required || false}>{field.text}</StyledTextField>
                                  </DataTableCell>

                                  <DataTableCell>
                                      <div>
                                          <div>
                                              <FieldWidget
                                                  field={field}
                                                  disabled={field.disabled}
                                                  onChange={onUpdateField}
                                                  errorLabels={errorLabels}
                                              />
                                          </div>
                                      </div>
                                  </DataTableCell>
                              </StyledDataTableRow>
                          );
                      })
                    : null}
            </TableBody>
        </DataTable>
    );
});

const StyledDataTableRow = styled(DataTableRow)`
    transition: background-color 0.5s;
    td {
        background-color: inherit !important;
        vertical-align: middle;
    }
`;

const StyledTextField = styled.span<{ required: boolean }>`
    ::after {
        content: ${props => (props.required ? "'*'" : "''")};
        margin-inline-start: 4px;
    }
`;
