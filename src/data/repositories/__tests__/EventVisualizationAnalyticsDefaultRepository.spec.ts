import { rewriteHeaderLine } from "../EventVisualizationAnalyticsDefaultRepository";

// The analytics line-list export addresses data elements by UID, so DHIS2 returns those UIDs as column
// headers while dimensions like `ou`/`eventdate` come back readable — the reason some downloaded line
// lists looked fine and others looked like machine output. rewriteHeaderLine maps ONLY the header row.
const namesById = new Map<string, string>([
    ["pKZfPhTGvJq", "Ward"],
    ["aBcDeFgHiJk", "Facility name"],
    ["xYzWvUtSrQp", "Pathogen, isolate"],
]);

describe("rewriteHeaderLine", () => {
    it("replaces a bare data element UID with its readable name", () => {
        expect(rewriteHeaderLine("pKZfPhTGvJq", namesById)).toBe("Ward");
    });

    it("replaces a stage-qualified `<stageUid>.<dataElementUid>` header with the data element name", () => {
        expect(rewriteHeaderLine("KCmWZD8qoAk.pKZfPhTGvJq", namesById)).toBe("Ward");
    });

    it("leaves headers it does not recognise untouched (org unit, event date, already-readable labels)", () => {
        const line = "ou,eventdate,Organisation unit";

        expect(rewriteHeaderLine(line, namesById)).toBe("ou,eventdate,Organisation unit");
    });

    it("maps a full mixed header row, replacing only the UID columns", () => {
        const line = "ou,eventdate,KCmWZD8qoAk.pKZfPhTGvJq,aBcDeFgHiJk";

        expect(rewriteHeaderLine(line, namesById)).toBe("ou,eventdate,Ward,Facility name");
    });

    it("quotes a mapped name that contains a comma, so the column count is preserved", () => {
        // "Pathogen, isolate" must not silently become two columns.
        expect(rewriteHeaderLine("xYzWvUtSrQp", namesById)).toBe('"Pathogen, isolate"');
    });

    it("preserves a CRLF line ending", () => {
        expect(rewriteHeaderLine("aBcDeFgHiJk\r", namesById)).toBe("Facility name\r");
    });

    it("round-trips already-quoted header cells without double-escaping them", () => {
        expect(rewriteHeaderLine('"already, quoted",aBcDeFgHiJk', namesById)).toBe('"already, quoted",Facility name');
    });

    it("returns the row unchanged when no names are known", () => {
        const line = "ou,KCmWZD8qoAk.pKZfPhTGvJq";

        expect(rewriteHeaderLine(line, new Map())).toBe(line);
    });
});
