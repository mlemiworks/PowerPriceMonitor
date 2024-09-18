require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const cron = require("node-cron");
const NodeCache = require("node-cache");
const { formatDatesForApi } = require("./utils/dateFormatter");
const { parseXMLtoObject } = require("./utils/dataParser");

const app = express();
app.use("/api/notes");

app.use(cors());
app.use(express.static("dist"));

const dataCache = new NodeCache({ stdTTL: 3600 }); // 60 minutes cache

const fetchData = async () => {
  const [periodStart, periodEnd] = await formatDatesForApi();
  const apiKey = process.env.VITE_API_KEY;

  const url = `https://web-api.tp.entsoe.eu/api?documentType=A44&out_Domain=10YFI-1--------U&in_Domain=10YFI-1--------U&periodStart=${periodStart}&periodEnd=${periodEnd}&securityToken=${apiKey}`;

  const response = await fetch(url);
  const xmlData = await response.text();
  const parsedData = await parseXMLtoObject(xmlData);

  dataCache.set("priceData", parsedData);
};

// Fetch every hour, might change later
cron.schedule("0 * * * *", fetchData);

app.get("/", async (req, res) => {
  const cachedData = dataCache.get("priceData");

  if (cachedData) {
    res.json(cachedData);
  } else {
    await fetchData();
    res.json(cachedData);
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
