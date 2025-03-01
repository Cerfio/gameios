const express = require("express");
const bodyParser = require("body-parser");
const db = require("./models");
const { Op } = require("sequelize");
const axios = require("axios");

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get("/api/games", (req, res) =>
  db.Game.findAll()
    .then((games) => res.send(games))
    .catch((err) => {
      console.log("There was an error querying games", JSON.stringify(err));
      return res.send(err);
    })
);

app.post("/api/games", (req, res) => {
  const {
    publisherId,
    name,
    platform,
    storeId,
    bundleId,
    appVersion,
    isPublished,
  } = req.body;
  return db.Game.create({
    publisherId,
    name,
    platform,
    storeId,
    bundleId,
    appVersion,
    isPublished,
  })
    .then((game) => res.send(game))
    .catch((err) => {
      console.log("***There was an error creating a game", JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete("/api/games/:id", (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log("***Error deleting game", JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put("/api/games/:id", (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id).then((game) => {
    const {
      publisherId,
      name,
      platform,
      storeId,
      bundleId,
      appVersion,
      isPublished,
    } = req.body;
    return game
      .update({
        publisherId,
        name,
        platform,
        storeId,
        bundleId,
        appVersion,
        isPublished,
      })
      .then(() => res.send(game))
      .catch((err) => {
        console.log("***Error updating game", JSON.stringify(err));
        res.status(400).send(err);
      });
  });
});

app.post("/api/games/search", (req, res) => {
  const { name, platform } = req.body;

  const whereClause = {};

  if (name && name.trim() !== "") {
    whereClause.name = {
      [Op.like]: `%${name}%`,
    };
  }

  if (platform && platform.trim() !== "") {
    whereClause.platform = platform;
  }

  const gamesFound = db.Game.findAll({ where: whereClause })
    .then((games) => res.send(games))
    .catch((err) => {
      console.log("There was an error searching games", JSON.stringify(err));
      return res.status(400).send(err);
    });

  return gamesFound;
});

app.post("/api/games/populate", async (req, res) => {
  try {
    const androidUrl =
      "https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json";
    const iosUrl =
      "https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json";

    const [androidResponse, iosResponse] = await Promise.all([
      axios.get(androidUrl),
      axios.get(iosUrl),
    ]);

    const androidData = androidResponse.data;
    const iosData = iosResponse.data;

    // Deduplicate games before insertion
    const uniqueGames = {};
    
    // Process Android games
    for (const appGroup of androidData) {
      if (Array.isArray(appGroup)) {
        for (const app of appGroup) {
          if (app && app.name) {
            const key = `android-${app.app_id}`;
            if (!uniqueGames[key]) {
              uniqueGames[key] = {
                name: app.name,
                publisherId: app.publisher_id || null,
                platform: "android",
                storeId: app.app_id || null,
                bundleId: app.bundle_id || null,
                appVersion: app.version || null,
                isPublished: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            }
          }
        }
      }
    }
    
    // Process iOS games
    for (const appGroup of iosData) {
      if (Array.isArray(appGroup)) {
        for (const app of appGroup) {
          if (app && app.name) {
            const key = `ios-${app.app_id}`;
            if (!uniqueGames[key]) {
              uniqueGames[key] = {
                name: app.name,
                publisherId: app.publisher_id || null,
                platform: "ios",
                storeId: app.app_id || null,
                bundleId: app.bundle_id || null,
                appVersion: app.version || null,
                isPublished: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            }
          }
        }
      }
    }
    
    const allGames = Object.values(uniqueGames);
    
    console.log(
      `Processed ${Object.values(uniqueGames).filter(g => g.platform === 'android').length} Android games and ${Object.values(uniqueGames).filter(g => g.platform === 'ios').length} iOS games`
    );
    
    // Use updateOnDuplicate to update existing records
    await db.Game.bulkCreate(allGames, {
      updateOnDuplicate: ['name', 'publisherId', 'bundleId', 'appVersion', 'isPublished', 'updatedAt']
    });
    
    res.send({ success: true, count: allGames.length });
  } catch (error) {
    console.error("Error populating games:", error);
    res.status(500).send({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server is up on port 3000");
});

module.exports = app;
