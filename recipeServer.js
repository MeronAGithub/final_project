//Nodejs packages
const http = require("http");
const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
//port number
const portNumber = 3000;

app.use(express.static(path.join(__dirname, 'public')));


//routing
const pantry = require("./routes/pantry");
app.use('/pantry', pantry);

//MongoDB packages
// require("dotenv").config({
//     path: path.resolve(__dirname, ".env"),
// });
const { MongoClient, ServerApiVersion } = require("mongodb");

//Listen for stop
app.listen(portNumber)
console.log(`Web server started and running at http://localhost:${portNumber}`)
process.stdout.write("Stop to shutdown the server: ")
process.stdin.setEncoding("utf8");
process.stdin.on('readable', () => {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
        const command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        }
        process.stdin.resume();
    }
})



async function main() {
    //set up client connection to database
    const databaseName = "recipes"
    const uri = process.env.MONGO_CONNECTION_STRING;
    const client = new MongoClient(uri, {
        serverApi: ServerApiVersion.v1
    })
    const key = process.env.API_KEY;

    //set up body-parser for ejs templates
    app.use(bodyParser.urlencoded({ extended: false }))
    app.set("view engine", "ejs");
    app.set("views", path.resolve(__dirname, "templates"))

    try {
        await client.connect();
        const database = client.db(databaseName);
        const saved = database.collection("saved");
        const pantry = database.collection("pantry")

        //home page
        app.get("/", (req, res) => {
            res.render("index")
        })

        app.get("/searchApplication", (req, res) => {
            res.render("searchApplication")
        })

        app.post("/searchResults", async (req, res) => {

            //get data

            let { ingredient, cuisineSelected, dietSelected, intolerance, time } = req.body;

            //format data

            if (!ingredient) {
                let cursor = pantry.find({});
                let document = await cursor.next();
                let elems = [];

                while (document != null) {
                    elems.push(document.name)
                    document = await cursor.next();
                }

                ingredient = elems;
            }


            let ingredients = formatList(ingredient)
            let intolerances = intolerance ? `&intolerances=${formatList(intolerance)}` : ""
            let cuisine = cuisineSelected === "none" ? "" : `&cuisine=${cuisineSelected}`
            let diet = dietSelected === "none" ? "" : `&diet=${dietSelected}`
            let maxTime = `&maxReadyTime=${time}`

            let query = `https://api.spoonacular.com/recipes/complexSearch?searchByIngredients=${ingredients}&sort=min-missing-ingredients${intolerances}${cuisine}${diet}${maxTime}&addRecipeInformation=true&number=5&addRecipeInstructions=true&apiKey=${key}`;


            //fetch api call

            let response = await fetch(query);
            let json = await response.json();

            //format api data

            let recipes = json.results.map(elem => (
                {
                    title: elem.title,
                    image: elem.image,
                    summary: elem.summary,
                    readyInMinutes: elem.readyInMinutes,
                    servings: elem.servings,
                }
            ))

            //render

            const variables = { results: recipes }

            res.render("searchResults", variables);
        })

        app.post("/saveRecipe", async (req, res) => {
            const { title, image, readyInMinutes, servings, summary } = req.body;
            let recipe = { title: title, image: image, readyInMinutes: readyInMinutes, servings: servings, summary: summary }

            let success = await saved.insertOne(recipe);
            res.status(200)
        })

        app.get("/saved", async (req, res) => {
            let cursor = saved.find({});
            let document = await cursor.next();
            let recipes = [];
            while (document != null) {
                recipes.push(document);
                document = await cursor.next();
            }


            const variables = { results: recipes }

            res.render("savedRecipes", variables)
        })


    }

    catch (error) {
        console.error(error);
    }

}

function formatList(list) {
    return list.filter(elem => elem.length > 0).join(",");
}


main();