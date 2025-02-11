import * as cheerio from "cheerio";
import {Hono} from "hono";
import {cors} from "hono/cors";
import {handle} from "hono/vercel";


interface Meeting {
    meetingID: string;
    teamHome: string;
    teamGuest: string;
    scheduled: string;
    matchesHome: number;
    matchesGuest: number;
    halfTimeScoreHome: number;
    halfTimeScoreGuest: number;
    live: boolean;
    homeImgUrl: string;  // URL des Heim-Logos
    guestImgUrl: string; // URL des Gast-Logos
}

interface ParsedGame {
    meetingID: string;
    date: string;
    home_team: string;
    away_team: string;
    start_time: string;
    current_result: string;
    halftime_result: string;
    match_link: string;
    live: boolean;
    home_team_logo: string;  // Heim-Logo URL
    away_team_logo: string;  // Gast-Logo URL
}


export const config = {
    runtime: "edge",
};

const app = new Hono().basePath("/api");
app.use("*", cors());


app.get("/gameplan", async (c) => {
    const urlParams = c.req.query();  // Query-Parameter aus der URL lesen
    let championship = urlParams["championship"];
    let group = urlParams["group"];
    let teamtable = urlParams["teamtable"];
    let pageState = urlParams["pageState"] ? urlParams["pageState"] : "vorrunde";

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
    if (teamtable == null) {
        return c.json({
                error: "Bad Request: No teamtable provided"
            }, 400
        );
    }
    championship = championship.replace("/", "%2F").replace(" ", "+");

    const url = `https://hvs-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/teamPortrait?teamtable=${teamtable}&pageState=${pageState}&championship=${championship}&group=${group}`

    const res = await fetch(url);

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


app.get("/table", async (c) => {
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

// API-Endpunkt
app.get("/score/all", async (c) => {
    const urlParams = c.req.query();
    const group = urlParams["group"];

    if (!group) {
        return c.json({ error: "Bad Request: No group provided" }, 400);
    }

    // Berechne den aktuellen Unix-Timestamp in Sekunden
    let timestamp = Math.floor(Date.now() / 1000);

    // Runden des Timestamps auf das nächste Intervall, das auf 00 oder 30 endet
    const remainder = timestamp % 60;
    if (remainder < 30) {
        timestamp -= remainder;  // Runden auf die 00-Sekunde
    } else {
        timestamp += (60 - remainder);  // Runden auf die 30-Sekunde
    }

    const apiUrl = `https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/meetings/${group}/time/${timestamp}`;

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
            throw new Error("Fehler beim Abrufen der API-Daten");
        }

        const jsonData = await res.json();
        const games = parseMeetingsData(jsonData.meetings, group);

        return c.json(games);

    } catch (error: unknown) {  // Fehler als unknown typisieren
        if (error instanceof Error) {  // Auf den richtigen Typen prüfen
            console.error("API Fehler:", error.message);
            return c.json({ error: error.message }, 500);
        } else {
            console.error("Unbekannter Fehler:", error);
            return c.json({ error: "Unbekannter Fehler" }, 500);
        }
    }
});

// API-Endpunkt für das neueste Ergebnis eines bestimmten Vereins
app.get("/score/recent", async (c) => {
    const urlParams = c.req.query();
    let team = urlParams["team"];
    const group = urlParams["group"];

    if (!team) {
        return c.json({ error: "Bad Request: No team provided" }, 400);
    }else{
        team = decodeURIComponent(team.replace(/\+/g, ' '));
    }

    if (!group) {
        return c.json({ error: "Bad Request: No group provided" }, 400);
    }

    console.log("Team:", team);
    console.log("Gruppe:", group);

    // Berechne den aktuellen Unix-Timestamp in Sekunden
    let timestamp = Math.floor(Date.now() / 1000);

    // Runden des Timestamps auf das nächste Intervall, das auf 00 oder 30 endet
    const remainder = timestamp % 60;
    if (remainder < 30) {
        timestamp -= remainder;  // Runden auf die 00-Sekunde
    } else {
        timestamp += (60 - remainder);  // Runden auf die 30-Sekunde
    }

    const apiUrl = `https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/meetings/${group}/time/${timestamp}`;

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
            throw new Error("Fehler beim Abrufen der API-Daten");
        }

        const jsonData = await res.json();
        const games = parseMeetingsData(jsonData.meetings, group);

        // Filtern und das neueste Spiel auswählen
        const latestGame = getLatestGame(games, team);

        if (!latestGame) {
            return c.json({ error: `Kein Spiel gefunden für das Team: ${team}` }, 404);
        }

        return c.json(latestGame);

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("API Fehler:", error.message);
            return c.json({ error: error.message }, 500);
        } else {
            console.error("Unbekannter Fehler:", error);
            return c.json({ error: "Unbekannter Fehler" }, 500);
        }
    }
});

app.get("/score/recent/test", async (c) => {
    const urlParams = c.req.query();
    let team = urlParams["team"];
    const group = urlParams["group"];

    if (!team) {
        return c.json({ error: "Bad Request: No team provided" }, 400);
    }else{
        team = decodeURIComponent(team.replace(/\+/g, ' '));
    }

    if (!group) {
        return c.json({ error: "Bad Request: No group provided" }, 400);
    }

    // Berechne den aktuellen Unix-Timestamp in Sekunden
    let timestamp = Math.floor(Date.now() / 1000);

    // Runden des Timestamps auf das nächste Intervall, das auf 00 oder 30 endet
    const remainder = timestamp % 60;
    if (remainder < 30) {
        timestamp -= remainder;  // Runden auf die 00-Sekunde
    } else {
        timestamp += (60 - remainder);  // Runden auf die 30-Sekunde
    }

    //aktuelles datum + 30 sekunden
    let test_date = new Date();
    console.log("Aktuelles Datum:", test_date);
    test_date.setSeconds(test_date.getSeconds() + 30);
    console.log("Testdatum:", test_date);

    // let test_date = new Date();
    // test_date.setSeconds(test_date.getSeconds() + 10);

    let response = {
        meetingID: "7699729",
        date: test_date.toLocaleDateString('de-DE'),
        home_team: "Sachsen 90 Werdau",
        away_team: "HC Pleißental",
        start_time: test_date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        current_result: `22 - 21`,
        halftime_result: `15 - 14`,
        match_link: `https://hbde-live.liga.nu/nuScoreLive/#/groups/367458/meetings/7699729`,
        live: true,
        home_team_logo: `https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/images/0a88d5bc-d619-4857-b57d-0217360fd151`, // Heim-Logo URL
        away_team_logo: `https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/images/23177fa0-88c9-4b01-8b7a-b8e2dcdcf1b5` // Gast-Logo URL
    };

    return c.json(response);
});


// Hilfsfunktion, die das neueste Spiel für das Team zurückgibt
function getLatestGame(meetings: ParsedGame[], team: string): ParsedGame | null {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // Format: 'YYYY-MM-DD'
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split("T")[0]; // Format: 'YYYY-MM-DD'

    // Filtere alle relevanten Spiele für das Team
    const relevantGames = meetings.filter(meeting =>
        (meeting.home_team === team || meeting.away_team === team)
    );

    // Suche nach Spielen vom heutigen oder gestrigen Tag
    const recentGames = relevantGames.filter(game => {
        const gameDate = game.date.split('T')[0]; // Extrahiere nur das Datum
        return gameDate === today || gameDate === yesterdayDate;
    });

    if (recentGames.length > 0) {
        // Wenn es Spiele vom heutigen oder gestrigen Tag gibt, gib das neueste zurück
        return recentGames[0];
    }

    // Suche nach zukünftigen Spielen
    const futureGames = relevantGames.filter(game => new Date(game.date) > now);

    if (futureGames.length > 0) {
        // Wenn ein zukünftiges Spiel gefunden wird, gib das erste zurück
        return futureGames.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    }

    // Wenn keine zukünftigen Spiele gefunden werden, gib einfach das erste verfügbare Spiel zurück
    if (relevantGames.length > 0) {
        return relevantGames[0]; // Gib das erste verfügbare Spiel zurück
    }

    // Falls kein Spiel gefunden wird, gib null zurück
    return null;
}



function parseMeetingsData(meetings: Meeting[], group: string): ParsedGame[] {
    return meetings.map((meeting: Meeting) => {
        return {
            meetingID: meeting.meetingID,
            date: new Date(meeting.scheduled).toLocaleDateString('de-DE'),
            home_team: meeting.teamHome,
            away_team: meeting.teamGuest,
            start_time: new Date(meeting.scheduled).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            current_minute: meeting.live ? "LIVE" : null,
            current_result: `${meeting.matchesHome} - ${meeting.matchesGuest}`,
            halftime_result: `${meeting.halfTimeScoreHome} - ${meeting.halfTimeScoreGuest}`,
            match_link: `https://hbde-live.liga.nu/nuScoreLive/#/groups/${group}/meetings/${meeting.meetingID}`,
            live: meeting.live,
            home_team_logo: `https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/images/${meeting.homeImgUrl}`, // Heim-Logo URL
            away_team_logo: `https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/images/${meeting.guestImgUrl}` // Gast-Logo URL
        };
    });
}

export default handle(app);