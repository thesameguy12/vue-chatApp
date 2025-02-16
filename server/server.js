
const express=require("express")
const app=express()
const cookieParser=require("cookie-parser")
const jwt=require("jsonwebtoken")
const http=require("http")
const {Server}=require("socket.io")
const cors=require("cors")
const session=require("express-session")
const bodyParser=require("body-parser")
const server=http.createServer(app)
const io=new Server(server,{cors:{
    origin:process.env.MONGODB_URL,
    methods:["GET","POST","PUT","DELETE"],
    credentials: true,
}})


require("dotenv").config();
const {MongoClient,ObjectId}=require("mongodb")
const db=new MongoClient(process.env.MONGODB_URL)
const MongoStore=require("connect-mongo")

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb://localhost:27017/chatApp",
      collectionName: "sessions",
    }),
  });


app.use(cors({origin: "http://localhost:5173", credentials: true }))
app.use(cookieParser())
app.use(sessionMiddleware)
app.use(express.json())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))
function authToken(req,res,next){
    const sessionToken=req.cookies.session
    const token=req.cookies.token
    
    if(token){
        jwt.verify(token,process.env.REFRESH_KEY,(err,decoded)=>{
            if(err){
                if(sessionToken){
                    jwt.verify(sessionToken,process.env.SECRET_KEY,(err,decode)=>{
                        if(!err){
                                res.cookie("token",jwt.sign({username:req.session.username},process.env.REFRESH_KEY,{expiresIn:'5m'}),{httpOnly:false})
                                return next()
                        }else{  
                            res.clearCookie("session").clearCookie("Session").clearCookie("token").sendStatus(400)
                            return
                        }
                    })
                }
            }else{
                return next()
            }
        })
    }else{
        return res.sendStatus(400)
    }
}
function authSession(req,res,next){
    const sessionToken=req.cookies.session
    if(sessionToken){
        jwt.verify(sessionToken,process.env.SECRET_KEY,(err,decode)=>{
            if(!err){
                res.cookie("session",jwt.sign({id:req.session.id},process.env.SECRET_KEY,{expiresIn:'3h'}),{httpOnly:false})
            }
            
        })
    }
    return next()
}



var onlineUsers={}
io.use((socket,next)=>{
    sessionMiddleware(socket.request, {}, next);
})
io.on("connection",(socket)=>{
    const socketSession=socket.request.session
    onlineUsers[socketSession.username]=socket.id

    socket.on("message",async (data)=>{
        
        await db.db("chatApp").collection("messages").insertOne({from:data.from,to:data.to,message:data.message,seen:0,time:data.time})
        socket.to(onlineUsers[data.to]).emit("message",data)
    })

    socket.on("messageSeen",async(data)=>{
        await db.connect()
        await db.db("chatApp").collection("messages").updateOne(
            { time: Number(data.messageID) },  
            { $set: { seen: 1 } }      
          )
          
        socket.to(onlineUsers[data.to]).emit("messageSeen",{time:data.messageID})
    })
    socket.on("typing",(data)=>{
        
        socket.to(onlineUsers[data.to]).emit("typing",data)
    })
    socket.on("disconect",()=>{
        delete onlineUsers[socket.id]
    })
    delete onlineUsers["undefined"]
})

app.post("/login",async (req,res)=>{
    const {username,password}=req.body
    await db.connect()
    const user=await db.db("chatApp").collection("users").find({username:username,password:password}).toArray()
    await db.close()
    
    if(user.length>0){
        req.session.sessionID=req.session.id
        req.session.username=username
        res.cookie("session",jwt.sign({id:req.session.id},process.env.SECRET_KEY,{expiresIn:'3h'}),{httpOnly:false})
        .cookie("token",jwt.sign({username:username},process.env.REFRESH_KEY,{expiresIn:'5m'}),{httpOnly:false})
        .status(200).send()
        return
    }else{
        res.send("Incorrect username or password!")
    }
})
app.delete("/login",(req,res)=>{
   
    res.clearCookie("session").clearCookie("Session").clearCookie("token").status(200).send("Logged out!")
    return
})
app.post("/signup",async (req,res)=>{
    let {username, password}=req.body
    await db.connect()
    await db.db("chatApp").collection("users").insertOne({username:username,password:password})
   
    res.status(200).send({message:"User created"})
    
})
app.get("/signup/:name",async (req,res)=>{
    let username=req.params.name
    await db.connect()
    const dbUsername=await db.db("chatApp").collection("users").find({username:username}).toArray()
    
    if(dbUsername.length>0){
        res.send("Username already taken")
    }else{
        res.send().status(200)
    }
})

app.get("/getMatchUsername",authToken,async(req,res)=>{
    
    await db.connect()
    const usernames=await db.db("chatApp")
    .collection("users")
    .find({ username: { $regex: req.query.username, $options: "i",$ne:req.session.username },friends: { $not: { $elemMatch: { user: req.session.username } } } })
    .project({ username: 1, _id: 0 })
    .skip(parseInt(req.query.skip))
    .limit(5)  
    .toArray()
    
    res.json(usernames)
})
app.get("/sendFriendRequest/:id",authToken,async (req,res)=>{
    await db.connect()
    await db.db("chatApp")
    .collection("users")
    .updateOne(
        { username: req.params.id },
        { $addToSet: { friends: {user:req.session.username,accepted:0} } }
    )

    await db.db("chatApp")
    .collection("users").updateOne(
        {username:req.session.username},
        {$addToSet:{friends:{user:req.params.id,accepted:1}}}
    )
   
    res.status(200).send("Friend request sent!")
})
app.get("/friends/:id",authToken,async(req,res)=>{
    await db.connect()
    const friends = await db.db("chatApp")
  .collection("users")
  .aggregate([
    {
      $match: {
        username: req.params.id // Match the specific user by username
      }
    },
    {
      $project: {
        friends: {
          $filter: {
            input: "$friends", // The array field to filter
            as: "friend", // Alias for each element in the array
            cond: { $eq: ["$$friend.accepted", 1] } // Condition to include only elements with accepted: 0
          }
        },
        _id: 0 // Exclude the _id field from the result
      }
    }
  ])
  .toArray();

    
    res.json(friends[0]?.friends)
})
app.get("/requests/:id",authToken,async(req,res)=>{
    await db.connect()
    const friends = await db.db("chatApp")
  .collection("users")
  .aggregate([
    {
      $match: {
        username: req.params.id // Match the specific user by username
      }
    },
    {
      $project: {
        friends: {
          $filter: {
            input: "$friends", // The array field to filter
            as: "friend", // Alias for each element in the array
            cond: { $eq: ["$$friend.accepted", 0] } // Condition to include only elements with accepted: 0
          }
        },
        _id: 0 // Exclude the _id field from the result
      }
    }
  ])
  .toArray();

   
    res.json(friends[0]?.friends)
})

app.get("/acceptFriendRequest/:id",authToken,async(req,res)=>{
    await db.connect()
    await db.db("chatApp").collection("users").updateOne({username:req.session.username,"friends.user":req.params.id},{$set:{"friends.$.accepted":1}})
    
    res.send("good")
})

app.get("/getMessages",authToken,async(req,res)=>{
    await db.connect()
    const messages= await db.db("chatApp").collection("messages").find({
        $or: [
          { $and: [{ to: req.session.username }, { from:req.query.chat  }] },
          { $and: [{ to: req.query.chat }, { from: req.session.username }] }
        ]
      }).skip(parseInt(req.query.skip)).limit(25).toArray()
    res.json(messages)
})

server.listen(process.env.PORT || 3000,()=>{
    console.log(`Server running on port ${process.env.PORT || 3000}`)
})
process.on("SIGINT", async () => {
    
    await db.close();
    process.exit();
});