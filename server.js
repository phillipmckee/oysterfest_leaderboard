require('dotenv').config({ path: './prod.env' });

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.DB_URI;
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
let db;

app.use(express.json());
app.use(express.static('public'));

async function connectToMongo() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        db = client.db("oyster_fest_leaderboard");
        console.log("Connected to MongoDB!");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    }
}
connectToMongo();

app.get('/getData', async (req, res) => {
    try {
        const teams = await db.collection('teams').find({}).toArray();
        console.log("Teams Data Sent to Frontend:", teams);  // Log data
        res.json({ teams });
    } catch (err) {
        console.error("Error retrieving data:", err);
        res.status(500).send('Error retrieving data');
    }
});


app.post('/updateData', async (req, res) => {
    const { userId, finalTime, timeBeforePenalties, penalties, bonus, round } = req.body;
    
    try {
        // Check: Retrieve and log the contestant name based on userId
        const contestant = await db.collection('contestants').findOne({ userId: userId });
        console.log("Retrieved Contestant:", contestant);
        
        // Check: Ensure name is used in the new team data
        const newTeam = {
            name: contestant.name,  // Ensure the correct name is used
            finalTime,
            timeBeforePenalties,
            penalties,
            bonus,
            round
        };
        console.log("New Team Data:", newTeam);
        
        const result = await db.collection('teams').insertOne(newTeam);
        io.emit('updateLeaderboard', newTeam);
        res.status(200).send('Data received and leaderboard updated');
    } catch (err) {
        console.error("Error updating data:", err);
        res.status(500).send('Error updating data');
    }
});


app.post('/updateRound', async (req, res) => {
    const { displayRound } = req.body;
    try {
        const result = await db.collection('settings').updateOne(
            { name: 'displayRound' },
            { $set: { value: displayRound }},
            { upsert: true }
        );
        io.emit('updateDisplayRound', displayRound);
        res.status(200).send('Display round updated');
    } catch (err) {
        console.error("Error updating display round:", err);
        res.status(500).send('Error updating display round');
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/getDisplayRound', async (req, res) => {
    try {
        const setting = await db.collection('settings').findOne({ name: 'displayRound' });
        const displayRound = setting ? setting.value : 1;
        res.json({ displayRound });
    } catch (err) {
        console.error("Error retrieving display round:", err);
        res.status(500).send('Error retrieving display round');
    }
});

app.delete('/deleteData', async (req, res) => {
    const { id } = req.body;
    try {
        const result = await db.collection('teams').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
            io.emit('teamDeleted', id);
            res.status(200).send('Data deleted');
        } else {
            res.status(404).send('Data not found');
        }
    } catch (err) {
        console.error("Error deleting data:", err);
        res.status(500).send('Error deleting data');
    }
});

app.get('/api/contestants', async (req, res) => {
    try {
        const contestants = await db.collection('contestants').find({}).toArray();
        res.json({ contestants });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/contestants', async (req, res) => {
    try {
        const { name, userId } = req.body;
        console.log(`Adding contestant: ${name}, ${userId}`);
        await db.collection('contestants').insertOne({ name, userId });
        res.status(200).send('Contestant Added');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


app.delete('/api/contestants', async (req, res) => {
    try {
        const { id } = req.body;
        await db.collection('contestants').deleteOne({ _id: new ObjectId(id) });
        res.status(200).send('Contestant Deleted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


app.put('/api/contestants', async (req, res) => {
    try {
        const { id, name, userId } = req.body;
        const result = await db.collection('contestants').updateOne(
            { _id: new ObjectId(id) },
            { $set: { name, userId }}
        );
        if (result.modifiedCount === 1) {
            res.status(200).send('Contestant Updated');
        } else {
            res.status(404).send('Contestant not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


