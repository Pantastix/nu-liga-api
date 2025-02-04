import * as cheerio from "cheerio";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";

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

  const jsonResult = JSON.stringify(tableRows);
  return c.json(jsonResult);
});

app.get("/tabelle", async (c) => {
  const res = await fetch(
    "https://hvs-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/groupPage?championship=Region+S%C3%BCdwestsachsen+24%2F25&group=367458"
  );
  const htmlString = await res.text();
  const $ = cheerio.load(htmlString);
  const table = $("table.result-set").eq(0);

  const tableRows = table
    .children()
    .eq(0)
    .children()
    .map((i, el) => {
      if (i > 0) return el;
    });
  return c.text(tableRows.toString() || "No element found");
});

export default handle(app);
