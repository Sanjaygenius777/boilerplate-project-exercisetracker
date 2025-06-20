const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(express.urlencoded({ extended: true }))

app.use(cors())
app.use(express.static('public'))

mongoose.connect(process.env.MONGO_URI)

let Person;

let user = new mongoose.Schema({
  username: String,
  count: Number,
  log: [{
    _id: false,
    description: String,
    duration: Number,
    date: String
  }
  ]
})

Person = mongoose.model('Person', user)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  try {
    const user = await Person.create({ username: req.body.username })
    console.log("user create:", user)
    let tempuser = user.toObject()
    delete tempuser.__v
    res.json(tempuser)
  } catch (err) {
    console.log("error:", err)
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await Person.find()
    console.log(users)
    res.json(users)
  }
  catch (err) {
    console.log("error", err)
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = new mongoose.Types.ObjectId(req.params['_id'])
  const description1 = req.body.description
  const duration1 = Number(req.body.duration)
  let date1 = req.body.date
  date1 = date1 ? new Date(date1).toDateString() : new Date().toDateString();
  const newlog = {
    description: description1,
    duration: duration1,
    date: date1
  }
  try {
    let data = await Person.findByIdAndUpdate(id, {
      $inc: { count: 1 },
      $push: { log: newlog }
    }, { new: true })
    console.log(data)
    data = { "_id": id, "username": data['username'], "date": date1, "duration": duration1, "description": description1 }
    res.json(data)
  } catch (error) {
    console.log("error occured", error)
  }
})

// app.get('/api/users/:_id/logs',async (req,res)=>{
//   const id = new mongoose.Types.ObjectId(req.params['_id'])
//   try {
//     let data=await Person.findById(id).lean()
//     data={"_id":data['_id'],"username":data.username,"count":data.count,"log":data.log
//     }
//     res.json(data)
//   } catch (error) {
//     console.log("Error occured",error)
//   }
// })


app.get('/api/users/:_id/logs', async (req, res) => {
  const id = new mongoose.Types.ObjectId(req.params['_id']);
  const { from, to, limit } = req.query;

  try {
    let data = await Person.findById(id).lean();
    if (!data) return res.status(404).json({ error: "User not found" });

    let logs = data.log || [];

    // Format all dates
    logs = logs.map(entry => ({
      description: entry.description,
      duration: entry.duration,
      date: new Date(entry.date).toDateString()
    }));

    // Apply "from" filter
    let fromDate;
    if (from) {
      fromDate = new Date(from);
      logs = logs.filter(entry => new Date(entry.date) >= fromDate);
    }

    // Apply "to" filter
    let toDate;
    if (to) {
      toDate = new Date(to);
      logs = logs.filter(entry => new Date(entry.date) <= toDate);
    }

    // Apply "limit"
    if (limit) {
      logs = logs.slice(0, Number(limit));
    }

    // Prepare response
    const response = {
      _id: data._id,
      username: data.username,
      count: logs.length,
      log: logs
    };

    if (fromDate) response.from = fromDate.toDateString();
    if (toDate) response.to = toDate.toDateString();

    res.json(response);

  } catch (error) {
    console.log("Error occurred", error);
    res.status(500).json({ error: "Server error" });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
