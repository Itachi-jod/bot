const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

console.log(`[COUNTRYINFO] Loading countryinfo.js from: ${__dirname}`);

const API_KEY = process.env.COUNTRYINFO_API_KEY || "7eac9dce-b646-4ad1-8148-5b58eddaa2cc";
const CACHE_DIR = path.join(os.tmpdir(), "countryinfo_cache");

// Country name aliases
const countryAliases = {
  "AMERICA": "United States",
  "USA": "United States",
  "UK": "United Kingdom",
  "BRITAIN": "United Kingdom",
  "RUSSIA": "Russian Federation",
  "CHINA": "China",
  "NORTH KOREA": "Korea, Democratic People's Republic of",
  "SOUTH KOREA": "Korea, Republic of"
};

module.exports = {
  config: {
    name: "cinfo",
    aliases: ["country", "countryinfo"],
    version: "1.0.5",
    author: "Lord Itachi",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Get information and flag of a country"
    },
    category: "info",
    guide: {
      en: "{prefix}countryinfo <country-name> (e.g., {prefix}countryinfo Nepal)"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const tempFiles = [];

    // Declare countryName at function scope
    let countryName = args.join(" ").trim() || "Unknown";
    let normalizedCountryName = countryName;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      await fs.ensureDir(CACHE_DIR);

      // Validate input
      if (countryName === "Unknown") {
        throw new Error("Please provide a country name (e.g., !countryinfo Nepal).");
      }

      // Normalize country name
      normalizedCountryName = countryName.replace(/\b\w/g, c => c.toUpperCase());
      // Apply alias mapping
      normalizedCountryName = countryAliases[normalizedCountryName.toUpperCase()] || normalizedCountryName;
      console.log(`[COUNTRYINFO] Fetching info for: ${normalizedCountryName} (Input: ${countryName})`);

      let countryData = null;
      let flagUrl = null;

      // Try primary API
      try {
        const encodedCountryName = encodeURIComponent(normalizedCountryName);
        const apiUrl = `https://kaiz-apis.gleeze.com/api/country-info?name=${encodedCountryName}&apikey=${API_KEY}`;
        const response = await retryRequest(apiUrl, 3, 1000);

        console.log(`[COUNTRYINFO] Primary API Response: ${JSON.stringify(response.data)}`);

        if (!response.data || response.data.status === "error") {
          throw new Error(response.data?.error || JSON.stringify(response.data) || "Unknown error");
        }

        countryData = response.data.data || response.data.country || response.data.result || response.data.info || response.data;
        flagUrl = countryData.flag || countryData.flags?.png || countryData.flags?.svg || null;

        if (!countryData.name && !countryData.common) {
          throw new Error("No valid country data found.");
        }
      } catch (error) {
        console.error(`[COUNTRYINFO] Primary API failed: ${error.message}`);

        // Fallback to RestCountries API
        const fallbackUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(normalizedCountryName)}?fullText=true`;
        const fallbackResponse = await retryRequest(fallbackUrl, 3, 1000);

        console.log(`[COUNTRYINFO] Fallback API Response: ${JSON.stringify(fallbackResponse.data)}`);

        if (!fallbackResponse.data?.length) {
          throw new Error(`No country data found for "${normalizedCountryName}". Try checking the spelling (e.g., "United States" instead of "America").`);
        }

        countryData = fallbackResponse.data[0];
        flagUrl = countryData.flags?.png || countryData.flags?.svg;
      }

      if (!flagUrl) {
        console.warn(`[COUNTRYINFO] No flag URL found for ${normalizedCountryName}.`);
        flagUrl = `https://flagcdn.com/w320/${countryData.cca2?.toLowerCase() || "un"}.png`;
      }

      // Download flag image
      console.log(`[COUNTRYINFO] Downloading flag from: ${flagUrl}`);
      const flagResponse = await retryRequest(flagUrl, 3, 1000, { responseType: "arraybuffer" });
      if (!flagResponse.headers["content-type"]?.startsWith("image/")) {
        throw new Error("Invalid flag image response.");
      }

      // Save flag image
      const fileName = `flag_${Date.now()}.png`;
      const filePath = path.join(CACHE_DIR, fileName);
      await fs.writeFile(filePath, flagResponse.data);
      tempFiles.push(filePath);

      if (!(await fs.pathExists(filePath))) {
        throw new Error("Failed to save flag image.");
      }

      // Format data
      const formattedData = {
        name: countryData.name?.common || countryData.name || "N/A",
        capital: Array.isArray(countryData.capital) ? countryData.capital[0] : countryData.capital || "N/A",
        population: countryData.population ? countryData.population.toLocaleString() : "N/A",
        currency: countryData.currencies ? Object.values(countryData.currencies)[0]?.name || "N/A" : countryData.currency || "N/A",
        region: countryData.region || "N/A",
        languages: countryData.languages ? Object.values(countryData.languages).join(", ") : countryData.language || countryData.languages || "N/A",
        area: countryData.area ? `${countryData.area.toLocaleString()} km²` : countryData.area || "N/A"
      };

      // Format output
      const formattedInfo = [
        `Country: ${formattedData.name}`,
        `Capital: ${formattedData.capital}`,
        `Population: ${formattedData.population}`,
        `Currency: ${formattedData.currency}`,
        `Region: ${formattedData.region}`,
        `Languages: ${formattedData.languages}`,
        `Area: ${formattedData.area}`
      ].filter(line => !line.endsWith("N/A")).join("\n");

      // Send response with flag
      await api.sendMessage({
        body: formattedInfo,
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        if (err) {
          console.error(`[COUNTRYINFO] Send message error: ${err.message}`);
          api.sendMessage(`Failed to send country info: ${err.message}`, threadID, messageID);
          api.setMessageReaction("❌", messageID, () => {}, true);
        } else {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }
        cleanupFiles(tempFiles);
      }, messageID);

    } catch (err) {
      console.error(`[COUNTRYINFO] Error: ${err.message}`);
      const errorMessage = err.response?.status === 429
        ? "API rate limit exceeded. Please try again later."
        : `Failed to fetch country info for "${normalizedCountryName || countryName}": ${err.message}`;
      api.sendMessage(errorMessage, threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      cleanupFiles(tempFiles);
    }
  },

  onLoad: async function () {
    try {
      await fs.ensureDir(CACHE_DIR);
      console.log(`[COUNTRYINFO] Cache directory ready: ${CACHE_DIR}`);
    } catch (e) {
      console.error(`[COUNTRYINFO] Cache setup failed: ${e.message}`);
    }
  }
};

async function retryRequest(url, retries = 3, delay = 1000, options = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, options);
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        console.log(`[COUNTRYINFO] Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (err) {
      console.error(`[COUNTRYINFO] Cleanup error: ${err.message}`);
      setTimeout(() => fs.unlink(file).catch(() => {}), 5000);
    }
  }
        }
