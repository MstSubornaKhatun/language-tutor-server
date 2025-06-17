const express = require('express')
const cors = require('cors')
const app = express()

const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin-key.json");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;


    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({ message: 'Unauthorized Access' });
    }
const token = authHeader.split(' ')[1];

try{
  const decoded = await admin.auth().verifyIdToken(token);
console.log('decoded token', decoded);
  req.decoded = decoded;

    next();
}
catch(error){
  return res.status(401).send({message: 'Unauthorized Access'})
}


};




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.honlggm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  }
});



const verifyTokenEmail = (req, res, next) => {
        if (email !== req.decoded.email){
        return res.status(403).send({message: 'Forbidden Access'})
      }
      next();
      
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const tutorsCollection = client.db('languageTutor').collection('tutors')
    const bookingsCollection = client.db('bookingsTutor').collection('bookings')




    app.get('/tutors', verifyFirebaseToken, verifyTokenEmail, async (req, res) => {

      const email = req.query.email;
      // console.log('req header', req.headers);
      // if (email !== req.decoded.email){
      //   return res.status(403).send({message: 'Forbidden Access'})
      // }
      

      
      const query = {};
      if (email) {
        query.email = email;
      }

      const cursor = tutorsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });




    app.get('/all-tutors', async (req, res) => {
  const result = await tutorsCollection.find().toArray();
  res.send(result);
});



    app.get('/tutors/bookings', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const tutors = await tutorsCollection.find(query).toArray();

      // should use aggregate to have optimum data fetching
      for (const tutor of tutors) {
        const bookingQuery = { tutorId: tutor._id.toString() }
        const booking_count = await bookingsCollection.countDocuments(bookingQuery)
        tutor.booking_count = booking_count;
      }
      res.send(tutors);

    })


    app.get('/tutors-by-language', async (req, res) => {
      const language = req.query.language;
      if (!language) {
        return res.status(400).send({ message: "Language is required" });
      }

      const tutors = await tutorsCollection.find({ language: language }).toArray();
      res.send(tutors);
    });









    //  tutors count
    app.get("/stats/tutors-count", async (req, res) => {
      try {
        const count = await tutorsCollection.estimatedDocumentCount();
        res.send({ count });
      } catch (error) {
        console.error("Tutors count error:", error);
        res.status(500).send({ error: "Failed to fetch tutors count" });
      }
    });

    // languages count
    app.get("/stats/languages-count", async (req, res) => {
      try {
        const languages = await tutorsCollection.distinct("language");
        res.send({ count: languages.length });
      } catch (error) {
        console.error("Languages count error:", error);
        res.status(500).send({ error: "Failed to fetch languages count" });
      }
    });

    //  reviews count
    app.get("/stats/reviews-count", async (req, res) => {
      try {
        res.send({ count: 0 });
      } catch (error) {
        console.error("Reviews count error:", error);
        res.status(500).send({ error: "Failed to fetch reviews count" });
      }
    });
app.patch('/bookings/review/:id', async (req, res) => {
  const id = req.params.id;
  const { review } = req.body;

  try {
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        reviewGiven: true,
        review: review || 1, // Default review is 1
      },
    };
    const result = await bookingsCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).send({ error: "Failed to submit review" });
  }
});



    // users count 
    app.get("/stats/users-count", async (req, res) => {
      try {
        const emails = await tutorsCollection.distinct("email");
        res.send({ count: emails.length });
      } catch (error) {
        console.error("Users count error:", error);
        res.status(500).send({ error: "Failed to fetch users count" });
      }
    });




    // POST booking
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const existing = await bookingsCollection.findOne({ tutorId: booking.tutorId, userEmail: booking.userEmail });
      if (existing) return res.send({ message: 'Already booked' });

      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    // GET bookings by user email
    app.get("/bookings", verifyFirebaseToken, async (req, res) => {
      const { email, tutorId } = req.query;

   
      const query = {};
      if (email) query.userEmail = email;
      if (tutorId) query.tutorId = tutorId;
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });
    

    // update
    app.get('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const tutor = await tutorsCollection.findOne(query);
      res.send(tutor);
    });
    app.put('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedTutor = req.body;
      const updatedDoc = {
        $set: updatedTutor
      }
      const result = await tutorsCollection.updateOne(filter, updatedDoc, options);

      res.send(result);
    })



    // delete
    app.delete('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await tutorsCollection.deleteOne(query);
      res.send(result);
    })






    app.get('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await tutorsCollection.findOne(query);
      res.send(result)
    });


    app.post('/tutors', async (req, res) => {
      const newTutor = req.body;
      console.log(newTutor);
      const result = await tutorsCollection.insertOne(newTutor);
      res.send(result);
    })





    // tutor bookings related apis
    app.get('/bookings', async (req, res) => {
      const email = req.query.email;

      const query = {
        applicant: email
      }
      const result = await bookingsCollection.find(query).toArray();


      res.send(result);
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });


    app.get('/bookings/tutor/:tutor_id', async (req, res) => {
      const tutor_id = req.params.tutor_id;
      // console.log(tutor_id);
      const query = { tutorId: tutor_id }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    })



    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: req.body.status
        }
      }

      const result = await bookingsCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Language Tutor Cooking')
})

app.listen(port, () => {
  console.log(`Language Tutor server is running on ${port}`)
})






