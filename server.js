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
  characters: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Character"
  }
})

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

app.use("/users/:id", authenticateUser)

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
  party: [String]
})

app.get("/character", (req, res) => {
  Character.find().then(characters => {
    res.json(characters)
  })
})

app.post("/character", (req, res) => {
  const jsonBody = req.body
  const character = new Character(jsonBody)

  character.save().then(() => {
    res.status(201).json({ created: true})
  }).catch(err => {
    res.status(400).json({ created: false, errorMsg: err.message })
  })
})
