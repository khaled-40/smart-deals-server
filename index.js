const express = require('express');
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;



const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middlewire 
app.use(cors());
app.use(express.json());
// console.log(process.env)

const verifyFirebaseToken = async (req, res, next) => {
    console.log('in the middleware', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    console.log(!token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    // Token ID Verification
    try {
        const userInfo = await admin.auth().verifyIdToken(token);
        req.token_email = userInfo.email;
        console.log(userInfo)
        next()
    }
    catch {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    // next();
}
const verifyJWTToken = async (req, res, next) => {
    console.log('in the middleware', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    console.log(!token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.token_email = decoded.email;
        console.log('after decoded', decoded)
    })
    next();

}

// const uri = "mongodb+srv://smartDBUser:JMb2dI1mv3koV8ZX@cluster0.uk3n3pp.mongodb.net/?appName=Cluster0";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uk3n3pp.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// These will be set on first request
let productsCollection, bidsCollection, usersCollection;

async function getCollections() {
    if (productsCollection) return { productsCollection, bidsCollection, usersCollection };

    await client.connect();
    const db = client.db('smartDB');
    productsCollection = db.collection('products');
    bidsCollection = db.collection('bids');
    usersCollection = db.collection('users');
    console.log('MongoDB connected (reused on next calls)');
    return { productsCollection, bidsCollection, usersCollection };
}

app.get('/', (req, res) => {
    res.send('simple server is running')
})

app.get('/products', async (req, res) => {
    // const projectFields = {title:1 , price_min:1, email:1}
    // const cursor = productsCollection.find().sort({price_min: -1}).skip(2).limit(5).project(projectFields);

    console.log(req.query)

    const { productsCollection } = await getCollections();
    const cursor = productsCollection.find();
    const result = await cursor.toArray();
    res.send(result)
})

app.post('/getToken', (req, res) => {
    const loggedUser = req.body;
    var token = jwt.sign(loggedUser, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.send({ token: token })
})

app.get('/latest-products', async (req, res) => {
    const { productsCollection } = await getCollections();
    const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6);
    const result = await cursor.toArray();
    res.send(result);
})


app.post('/users', async (req, res) => {
    const { usersCollection } = await getCollections();
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



app.get('/bids', verifyFirebaseToken, async (req, res) => {
    const { bidsCollection } = await getCollections();
    // console.log('headers', req.headers)
    const email = req.query.email;
    const query = {};
    if (email) {
        query.buyer_email = email
    }
    if (req.token_email !== email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const cursor = bidsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
})

// verify token with firebase 
// app.get('/bids',verifyFirebaseToken, async (req, res) => {
//     console.log('headers', req.headers)
//     const email = req.query.email;
//     const query = {};
//     if (email) {
//         query.buyer_email = email
//     }
//     if(email !== req.token_email) {
//         return res.status(403).send({message: 'forbidden access'})
//     }
//     const cursor = bidsCollection.find(query);
//     const result = await cursor.toArray();
//     res.send(result);
// })

app.get('/products/:id', async (req, res) => {
    const { productsCollection } = await getCollections();
    const id = req.params.id;
    console.log(id)
    const query = { _id: id };
    const result = await productsCollection.findOne(query);
    console.log(result)
    res.send(result)
})

app.post('/products', verifyFirebaseToken, async (req, res) => {
    const { productsCollection } = await getCollections();
    console.log(req.headers)
    const newProduct = req.body;
    const result = await productsCollection.insertOne(newProduct);
    res.send(result)
})

app.patch('/products/:id', async (req, res) => {
    const { productsCollection } = await getCollections();
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
    const { productsCollection } = await getCollections();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await productsCollection.deleteOne(query);
    res.send(result)
})

app.post('/bids', async (req, res) => {
    const { bidsCollection } = await getCollections();
    const newBid = req.body;
    const result = await bidsCollection.insertOne(newBid);
    res.send(result)
})

app.delete('/bids/:id', async (req, res) => {
    const { bidsCollection } = await getCollections();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await bidsCollection.deleteOne(query)
    res.send(result)
})

app.get('/product/bids/:productId', async (req, res) => {
    const { bidsCollection } = await getCollections();
    const productId = req.params.productId;
    const query = { product: productId };
    const cursor = bidsCollection.find(query);
    const result = await cursor.toArray();
    result.sort((a, b) => parseFloat(b.bid_price) - parseFloat(a.bid_price));
    res.send(result);
})

// app.listen(port, () => {
//     console.log(`simple server is running on port ${port}`)
// })
module.exports = app;