import mongoose from "mongoose"
import express from "express"
import bodyParser from "body-parser"
import cors from "cors"
import bcrypt from "bcrypt-nodejs"
import uuid from "uuid/v4"

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(cors())

const mongoServer = process.env.MONGO_URL || "mongodb://localhost/dnd-user-info"
mongoose.connect(mongoServer, { useNewUrlParser: true })

mongoose.Promise = Promise

mongoose.connection.on("error", err => console.error("Connection error:", err))
mongoose.connection.once("open", () => console.log("Connected to mongodb"))

const port = process.env.PORT || 8081
app.listen(port, () => console.log(`Server running on port ${port}`))

 /////////////////////////////////////////////////////////////

// User model
const User = mongoose.model("User", {
  username: {
    type: String,
    trim: true,
    required: [true, "A username must be provided"],
    unique: [true, "This username is not available."]
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: [true, "Please enter an email address"],
    unique: [true, "An account with this email address already exists."],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"]
  },
  password: {
    type: String,
    trim: true,
    required: [true, "Please enter a password"]
  },
  accessToken: {
    type: String,
    default: () => uuid()
  },
  characters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Character"
  }]
})

// User login endpoint
app.post("/sessions", (req, res) => {
  User.findOne({ username: req.body.username }).then(user => {
    if (bcrypt.compareSync(req.body.password, user.password)) {
      res.json({
        message: "Success!",
        token: user.accessToken,
        userId: user.id
      })
    } else {
      res.status(401).json({ message: "Authentication failure" })
    }
  })
})

// Authentication middleware
const authenticateUser = (req, res, next) => {
  User.findById(req.params.id)
    .then(user => {
      if (user.accessToken === req.headers.accesstoken) {
        req.user = user
        next()
      } else {
        res.status(401).json({ loggedOut: true })
      }
    })
}

// Use middleware for all endpoints beginning with /users/:id
// app.use("/users/:id", authenticateUser)

// User sign-up endpoint
app.post("/users", (req, res) => {
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password)
  })
  user.save().then(() => {
    res.status(201).json({ created: true })
  }).catch(err => {
    res.status(400).json({ created: false, error: err })
  })
})

 /////////////////////////////////////////////////////////////

// Character model
const Character = mongoose.model("Character", {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  name: String,
  class_level: String,
  background: String,
  race: String,
  alignment: String,
  experience_points: Number,
  gold: Number,
  spells: [Number],
  portrait: String,
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Party"
  }
})

// GET all characters
app.get("/characters", (req, res) => {
  Character
  .find()
  .populate({path: "party", select: "name"})
  .then(characters => {
    res.json(characters)
  })
})

// GET character by ID
app.get("/characters/:id", (req, res) => {
  const id = req.params.id
  Character.findById(id)
  .then(character => {
    res.json(character)
  })
})

// POST new character
app.post("/characters", (req, res) => {
  const jsonBody = req.body
  const character = new Character(jsonBody)

  character.save().then(() => {
    res.status(201).json({ created: true})
  }).catch(err => {
    res.status(400).json({ created: false, errorMsg: err.message })
  })
})

// Add character to team
app.put("/characters/:id/party", (req, res) => {
  const id = req.params.id
  const update = req.body.party
  Character.findByIdAndUpdate(id, { party: update }).then(() => {
    Character.findById(id)
  }, res.send(id))
})

/////////////////////////////////////////////////////////////

// Party model
const Party = mongoose.model("Party", {
 name: {
    type: String,
    required: true
  },
 members: [{
   type: mongoose.Schema.Types.ObjectId,
   ref: "Character"
 }]
})

// GET all parties
app.get("/parties", (req, res) => {
 Party
 .find()
 .populate({path: "members", select: "name portrait"})
 .then(parties => {
   res.json(parties)
 })
})

// POST new party
app.post("/parties", (req, res) => {
 const jsonBody = req.body
 const party = new Party(jsonBody)

 party.save().then(() => {
   res.status(201).json({ created: true})
 }).catch(err => {
   res.status(400).json({ created: false, errorMsg: err.message })
 })
})

// Add a character to a party
app.put("/parties/:id/add", (req, res) => {
  const id = req.params.id
  const update = req.body.member
  Party.findByIdAndUpdate(id, 
    { $push : { "members" : update } }
  )
  .then(() => {
    Party.findById(id)
  }, res.send(id))
})
