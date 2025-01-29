import _ from "lodash";
import * as XLSX from "xlsx";
import {
    Async,
    Row,
    Sheet,
    Spreadsheet,
    SpreadsheetDataSource,
} from "../../domain/repositories/SpreadsheetXlsxRepository";
import sodium from "libsodium-wrappers";
import XlsxPopulate from "@eyeseetea/xlsx-populate";

export class SpreadsheetXlsxDataSource implements SpreadsheetDataSource {
    async read(inputFile: File): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(await inputFile?.arrayBuffer(), { cellDates: true });

            const sheets = _(workbook.Sheets)
                .toPairs()
                .map(([sheetName, worksheet]): Sheet => {
                    const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" })[0] || [];
                    const rows = XLSX.utils.sheet_to_json<Row<string>>(worksheet, { raw: true, skipHidden: false });

                    return {
                        name: sheetName,
                        headers,
                        rows,
                    };
                })
                .value();

            const spreadsheet: Spreadsheet = {
                name: inputFile.name,
                sheets,
            };

            return spreadsheet;
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }

    async readFromArrayBuffer(arrayBuffer: ArrayBuffer, fileName?: string): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(arrayBuffer, { cellDates: true });

            const sheets = _(workbook.Sheets)
                .toPairs()
                .map(([sheetName, worksheet]): Sheet => {
                    const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" })[0] || [];
                    const rows = XLSX.utils.sheet_to_json<Row<string>>(worksheet, { raw: true, skipHidden: false });

                    return {
                        name: sheetName,
                        headers,
                        rows,
                    };
                })
                .value();

            const spreadsheet: Spreadsheet = {
                name: fileName || "",
                sheets,
            };

            return spreadsheet;
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }

    async encryptColumn(inputFile: File, rowCount: number): Async<File> {
        try {
            const workbook = await XlsxPopulate.fromDataAsync(await inputFile.arrayBuffer());
            // const sheets = workbook.sheets();
            // if (!sheets) return inputFile;

            // for (let i = 6; i < rowCount + 6; i++) {
            //     const cellValue = sheets[0]?.column("H").cell(i).value();

            //     if (cellValue) {
            //         const encryptedPatientId = this.encryptString(cellValue.toString() || "");
            //         workbook.sheet("Data Entry").column("H").cell(i).value(encryptedPatientId);
            //     }
            // }

            const data = await workbook.outputAsync({ password: "123456789012345678901234" });
            const file = new File([data], inputFile.name, { type: inputFile.type });
            return file;
        } catch (e) {
            return inputFile;
        }
    }

    private encryptString(input: string): string {
        const keyGeneral = sodium.crypto_secretbox_keygen();
        //Why convert to base 64 and back?
        const keyBase64 = sodium.to_base64(keyGeneral);
        const key = sodium.from_base64(keyBase64);

        const inputBytes = sodium.from_string(input);
        const nonce = sodium.from_string("123456789012345678901234"); //Is this the secret?
        const encrypted = sodium.crypto_secretbox_easy(inputBytes, nonce, key);
        return sodium.to_base64(nonce) + ":" + sodium.to_base64(encrypted);
    }
}
