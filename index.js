const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// middlewire 
app.use(cors());
app.use(express.json());

// JMb2dI1mv3koV8ZX

const uri = "mongodb+srv://smartDBUser:JMb2dI1mv3koV8ZX@cluster0.uk3n3pp.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db('smartDB');
        const productsCollection = db.collection('products');
        const bidsCollection = db.collection('bids');
        const usersCollection = db.collection('users');


        app.get('/products', async (req, res) => {
            // const projectFields = {title:1 , price_min:1, email:1}
            // const cursor = productsCollection.find().sort({price_min: -1}).skip(2).limit(5).project(projectFields);

            console.log(req.query)


            const cursor = productsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

       app.get('/latest-products', async(req,res) => {
        const cursor = productsCollection.find().sort({created_at: -1}).limit(6);
        const result = await cursor.toArray();
        res.send(result);
       })


        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                res.send({ message: 'user already exist' });
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        })



        app.get('/bids', async (req, res) => {

            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyer_email = email
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: id };
            const result = await productsCollection.findOne(query);
            console.log(result)
            res.send(result)
        })

        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result)
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const newProduct = req.body;
            const query = { _id: new ObjectId(id) };
            const update = {
                $set: {
                    name: newProduct.name,
                    price: newProduct.price
                }
            };
            const result = await productsCollection.updateOne(query, update);
            res.send(result);
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        })

        app.post('/bids', async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result)
        })

        app.get('/product/bids/:productId', async(req,res) => {
            const productId = req.params.productId;
            const query = {product: productId};
            const cursor = bidsCollection.find(query).sort({bid_price: 1});
            const result = await cursor.toArray();
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('simple server is running')
})

app.listen(port, () => {
    console.log(`simple server is running on port ${port}`)
})