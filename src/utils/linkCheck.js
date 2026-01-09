import axios from "axios";
import * as cheerio from "cheerio";

export const checkSingleLink = async ({ host, url, mention }) => {
    try {
        const response = await axios.get(host, {
            timeout: 5000,
            headers: { "User-Agent": "Mozilla/5.0" },
            maxRedirects: 3,
        });

        const $ = cheerio.load(response.data);

        let linkFound = false;
        let anchorFound = false;

        $("a").each((_, el) => {
            const href = $(el).attr("href") || "";
            const text = $(el).text().trim().toLowerCase();
            if (href.includes(url)) {
                linkFound = true;
                if (
                    mention &&
                    mention !== url &&
                    text === mention.toLowerCase()
                ) {
                    anchorFound = true;
                }
            }
        });

        if (linkFound && anchorFound)
            return { success: true, status: "There's a link and a mention" };

        if (linkFound)
            return { success: true, status: "There's a link" };

        if (anchorFound)
            return { success: true, status: "There's a mention" };

        return { success: true, status: "There's no link or mention" };

    } catch (err) {
        return { success: false, status: "Website failed" };
    }
};
