import React, { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../../contexts/app-context";

import { DataForm } from "../../../domain/entities/DataForm";
import { DataValue, DataValueStore, Period } from "../../../domain/entities/DataValue";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Id } from "../../../domain/entities/Base";
import TableForm from "./TableForm";
import { Maybe } from "../../../types/utils";

export interface DataFormComponentProps {
    dataSetId: Id;
    orgUnitId: Id;
    period: Period;
}

const DataFormComponent: React.FC<DataFormComponentProps> = props => {
    const dataFormInfo = useDataFormInfo(props);
    if (!dataFormInfo) return <div>{i18n.t("Loading...")}</div>;
    const { dataForm } = dataFormInfo.metadata;

    if (dataForm.sections.length === 0)
        return <p>{i18n.t("There are no sections in this data set. Check README for more details")}</p>;

    return (
        <div key={dataFormInfo.period}>
            {dataForm.sections.map(section => {
                return <TableForm key={section.id} dataFormInfo={dataFormInfo} section={section} />;
            })}
        </div>
    );
};

function useDataFormInfo(options: DataFormComponentProps): Maybe<DataFormInfo> {
    const { dataSetId, orgUnitId, period } = options;
    const { compositionRoot } = useAppContext();
    const [dataForm, setDataForm] = useState<DataForm>();
    const [dataValues, setDataValues] = useState<DataValueStore>();

    const defaultCategoryOptionComboId = "HllvX50cXC0";

    useEffect(() => {
        compositionRoot.dataForms.get(dataSetId).then(setDataForm);
    }, [compositionRoot, dataSetId]);

    useEffect(() => {
        compositionRoot.dataForms.getValues(dataSetId, { orgUnitId, period }).then(setDataValues);
    }, [compositionRoot, orgUnitId, dataSetId, period]);

    const saveDataValue = useCallback(
        (dataValue: DataValue) => compositionRoot.dataForms.saveValue(dataValue),
        [compositionRoot]
    );

    return dataForm && dataValues
        ? {
              metadata: { dataForm },
              data: { values: dataValues, save: saveDataValue },
              orgUnitId,
              period,
              categoryOptionComboId: defaultCategoryOptionComboId,
          }
        : undefined;
}

export interface DataFormInfo {
    metadata: { dataForm: DataForm };
    data: {
        values: DataValueStore;
        save: (dataValue: DataValue) => Promise<void>;
    };
    categoryOptionComboId: Id;
    orgUnitId: Id;
    period: Period;
}

export default React.memo(DataFormComponent);
