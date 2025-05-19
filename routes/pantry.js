const path = require("path");
const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
});
const { MongoClient, ServerApiVersion } = require("mongodb");

async function main() {

    const databaseName = "recipes"
    const uri = process.env.MONGO_CONNECTION_STRING;
    const client = new MongoClient(uri, {
        serverApi: ServerApiVersion.v1
    })

    router.use(bodyParser.urlencoded({ extended: false }))

    try {
        await client.connect();
        const database = client.db(databaseName);
        let pantry = database.collection("pantry");

        router.get("/", async (req, res) => {
            let cursor = pantry.find({});
            let document = await cursor.next();
            let html = ``;
            while (document != null) {
                html += `<li>${document.name}</li>`
                document = await cursor.next();
            }
            const variables = { pantry: html }

            res.render("pantry", variables)
        })

        router.get("/addItems", async (req, res) => {
            let cursor = pantry.find({});
            let document = await cursor.next();
            let html = ``;
            while (document != null) {
                html += `<li>${document.name}</li>`
                document = await cursor.next();
            }
            const variables = { pantry: html }

            res.render("addItems", variables)
        })

        router.post("/addToPantry", async (req, res) => {
            let { item } = req.body;

            let filter = { name: item };
            let exists = await pantry.findOne(filter)
            if (!exists && item.trim() != "") {
                let success = await pantry.insertOne({ name: item })
            }
            res.redirect("/pantry/addItems")
        })

        router.get("/removeItems", async (req, res) => {
            let cursor = pantry.find({});
            let document = await cursor.next();
            let elems = [];

            while (document != null) {
                elems.push(document)
                document = await cursor.next();
            }

            let variables = { allItems: elems }

            res.render("removeItems", variables)
        })


        router.post("/removeFromPantry", async (req, res) => {
            let { ingredient } = req.body

            ingredient = typeof ingredient === "string" ? [ingredient] : ingredient;

            ingredient.forEach(elem => {
                let filter = { name: elem };
                pantry.deleteOne(filter);
            })

            res.redirect("/pantry/removeItems")
        })


    }
    catch (error) {
        console.error(error);
    }
}

main();

module.exports = router;
