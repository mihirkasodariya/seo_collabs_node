import axios from "axios";
import * as cheerio from "cheerio";

export async function verifyWebsiteMeta(url, expectedToken) {
  try {
    const clean = url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

    const urlsToTry = [
      `https://${clean}`,
      `http://${clean}`,
      `https://www.${clean}`,
      `http://www.${clean}`,
    ];

    for (const siteUrl of urlsToTry) {
      try {
        const res = await axios.get(siteUrl, {
          timeout: 15000,
          maxRedirects: 5,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            Accept: "text/html",
          },
        });

        if (!res.data || typeof res.data !== "string") continue;

        const $ = cheerio.load(res.data);

        const meta = $('meta[name="seo-collabs-site-verification"]').attr("content");

        console.log("Checked URL:", siteUrl);
        console.log("Found meta:", meta);
        console.log("expectedToken meta:",expectedToken);

        if (
          meta &&
          meta.trim() === expectedToken.trim()
        ) {
          return true;
        }
      } catch (err) {
        console.log(err)
      }
    }

    return false;
  } catch (err) {
    return false;
  }
}



