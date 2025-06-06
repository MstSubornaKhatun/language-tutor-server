const express = require('express')
const cors = require('cors')
const app = express()

const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000;
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());



// language-tutor-admin
// gZf2HaCbnB4A7qpE

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.honlggm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
      const tutorCollection = client.db('languageTutor').collection('tutors')


    // tutors
    app.get('/tutors', async (req, res) => {
      const cursor = tutorCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // app.get('/jobs/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await tutorCollection.findOne(query);
    //   res.send(result)
    // });










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Language Tutor Cooking')
})

app.listen(port, () => {
  console.log(`Language Tutor server is running on ${port}`)
})
