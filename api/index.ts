import * as cheerio from "cheerio";
import {Hono} from "hono";
import {cors} from "hono/cors";
import {handle} from "hono/vercel";

export const config = {
    runtime: "edge",
};

const app = new Hono().basePath("/api");
app.use("*", cors());


app.get("/spielplan", async (c) => {
    const res = await fetch(
        "https://hvs-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/groupPage?championship=Region+S%C3%BCdwestsachsen+24%2F25&group=367458"
    );
    const htmlString = await res.text();
    const $ = cheerio.load(htmlString);
    const table = $("table.result-set").eq(1).children();
    let tableRows = table
        .children()
        .map((i, el) => {
            if (i > 0) {
                let day = $(el).children().eq(0).text().trim().replace(/\s+/g, " ");
                let date = $(el).children().eq(1).text().trim().replace(/\s+/g, " ");
                let indexTime = 2;
                let indexHalle = 3;
                let indexNr = 4;
                let indexHeimmannschaft = 5;
                let indexGastmannschaft = 6;
                let indexSpielstand = 7;
                if (day === "Termin offen") {
                    date = "";
                    indexTime = 1;
                    indexHalle = 2;
                    indexNr = 3;
                    indexHeimmannschaft = 4;
                    indexGastmannschaft = 5;
                    indexSpielstand = 6;
                }

                let time = $(el)
                    .children()
                    .eq(indexTime)
                    .text()
                    .trim()
                    .replace(/\s+/g, " ");
                let halle = $(el).children().eq(indexHalle);
                let nr = $(el)
                    .children()
                    .eq(indexNr)
                    .text()
                    .trim()
                    .replace(/\s+/g, " ");
                let heimmannschaft = $(el)
                    .children()
                    .eq(indexHeimmannschaft)
                    .text()
                    .trim()
                    .replace(/\s+/g, " ");
                let gastmannschaft = $(el)
                    .children()
                    .eq(indexGastmannschaft)
                    .text()
                    .trim()
                    .replace(/\s+/g, " ");
                let spielstand = $(el)
                    .children()
                    .eq(indexSpielstand)
                    .text()
                    .trim()
                    .replace(/\s+/g, " ");

                const hallenNr = halle.text().trim().replace(/\s+/g, " ");
                const halleHref = halle.find("a").attr("href");
                const halleName = halle.find("span").attr("title");

                return {
                    day,
                    date,
                    time,
                    halle: {
                        nr: hallenNr,
                        name: halleName,
                        href: halleHref,
                    },
                    nr,
                    heimmannschaft,
                    gastmannschaft,
                    spielstand,
                };
            }
        })
        .toArray();

    tableRows = tableRows.map((r, i) => {
        if (r.day === "Termin offen") {
            r.day = "";
        } else {
            if (r.day === "") r.day = tableRows[i - 1].day;
            if (r.date === "") r.date = tableRows[i - 1].date;
        }
        return r;
    });

    // const jsonResult = JSON.stringify(tableRows);
    return c.json(tableRows);
});


app.get("/tabel", async (c) => {
    const urlParams = c.req.query();  // Query-Parameter aus der URL lesen
    let championship = urlParams["championship"];
    let group = urlParams["group"];

    if (championship == null) {
        return c.json({
                error: "Bad Request: No championship provided"
            }, 400
        );
    }
    if (group == null) {
        return c.json({
                error: "Bad Request: No group provided"
            }, 400
        );
    }
    championship = championship.replace("/", "%2F").replace(" ", "+");

    let url = `https://hvs-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/groupPage?championship=${championship}&group=${group}`


    const res = await fetch(url);
    const htmlString = await res.text();
    const $ = cheerio.load(htmlString);
    const table = $("table.result-set").eq(0).children();

    let tableRows = table
        .children()
        .map((i, el) => {
            if (i > 0) {
                let position = $(el).children().eq(1).text().trim().replace(/\s+/g, " ");
                let team = $(el).children().eq(2).text().trim().replace(/\s+/g, " ");
                let matches = $(el).children().eq(3).text().trim().replace(/\s+/g, " ");
                let win = $(el).children().eq(4).text().trim().replace(/\s+/g, " ");
                let draw = $(el).children().eq(5).text().trim().replace(/\s+/g, " ");
                let lose = $(el).children().eq(6).text().trim().replace(/\s+/g, " ");
                let goals = $(el).children().eq(7).text().trim().replace(/\s+/g, " ");
                let difference = $(el).children().eq(8).text().trim().replace(/\s+/g, " ");
                let points = $(el).children().eq(9).text().trim().replace(/\s+/g, " ");

                return {
                    team,
                    position,
                    matches,
                    win,
                    draw,
                    lose,
                    goals,
                    difference,
                    points
                }
            }
        }).toArray()

    return c.json(tableRows);
});

export default handle(app);

//Region+Südwestsachsen+24%2F25
//Region%2BS%C3%BCdwestsachsen%2B24%2F25