// Mp8kKPh3ABIUUk5S

const cors = require("cors");
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");
require("dotenv").config();
app.use(express.json());
app.use(cors());
const stripe = require("stripe")(
  "sk_test_51L1CCDGNqDr1x0jXfD1ulRKMbmTfNHYqb7xn3ZfkWdJSPbcLbe6HuvVoLLgQrPgaFNoqPpwvNeBoAqeCpJEprUam00bKzpYKvs"
);

app.use(express.static("public"));
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.we6w6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ message: "unauthorized" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

//Email sender==============================
const auth = {
  auth: {
    api_key: "15fe502ec8950abc8e2f1215d265f0f2-8d821f0c-83abcec7",
    domain: "sandbox97d3f2e4987245f6b0d9d1b42b12ee33.mailgun.org",
  },
};
const nodemailerMailgun = nodemailer.createTransport(mg(auth));
//=====================================
async function run() {
  try {
    await client.connect();
    const partsCollection = client
      .db("computerUpgrade")
      .collection("all-Parts");
    const orderCollection = client.db("computerUpgrade").collection("order");
    const reviewCollection = client
      .db("computerUpgrade")
      .collection("all-reviews");
    const userCollection = client.db("computerUpgrade").collection("users");
    const paymentCollection = client
      .db("computerUpgrade")
      .collection("payments");

    //Email sender

    // const email = {
    //   from: "myemail@example.com",
    //   to: "mdriazuddin417@gmail.com",
    //   subject: "Hey you, awesome!",
    //   text: "Mailgun rocks, pow pow!",
    // };

    // app.get("/email", async (req, res) => {
    //   nodemailerMailgun.sendMail(email, (err, info) => {
    //     if (err) {
    //       console.log(err);
    //     } else {
    //       console.log(info);
    //     }
    //   });

    //   res.send({ status: true });
    // });

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req?.decoded?.email;

      const requesterAccount = await userCollection.findOne({
        email: requester,
      });

      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    };

    ////Payment Methods
    // app.post("/create-payment-intent", async (req, res) => {
    //   const { price } = req.body;
    //   const amount = price * 100;
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: amount,
    //     currency: "usd",
    //     payment_method_types: ["card"],
    //   });

    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    //User Collection All set
    //token
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });

      res.send({ result, token: token });
    });
    app.get("/users", async (req, res) => {
      const query = req.query;
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    //setAdmin
    app.patch(
      "/user/admin/:email",

      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;

        const role = req.body;

        const filter = { email: email };
        const updatedDoc = {
          $set: { ...role }
        };

        const result = await userCollection.updateOne(filter, updatedDoc);

        res.send(result);
      }
    );

    app.post("/add-user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne({ ...user, role: "user" });
      res.send(result);
    });
    //User end

    //Part Collection Start
    app.get("/all-parts", async (req, res) => {
      const result = await partsCollection.find({}).toArray();

      res.send(result);
    });
    app.post("/part", async (req, res) => {
      const part = req.body;
      const result = await partsCollection.insertOne({ ...part });
      res.send(result);
    });

    app.get("/part/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });
    app.delete("/part/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/part/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const part = req.body;

      const filter = { _id: ObjectId(id) };

      const updatedDoc = {
        $set: {
          ...part,
        },
      };
      const result = await partsCollection.updateOne(filter, updatedDoc);

      res.send(result);
    });

    //Reviews Collection all
    app.get("/all-reviews", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });
    app.post("/add-review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne({ ...review });
      res.send(result);
    });
    //Review end

    //Order Collection Start
    app.get("/order", verifyToken, async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded.email;

      if (email === decodedEmail) {
        const query = { email: email };
        const result = await orderCollection.find(query).toArray();
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });
    app.get("/admin-order", async (req, res) => {
      const result = await orderCollection.find({}).toArray();
      res.send(result);
    });

    app.post("/order", async (req, res) => {
      const parts = req.body;

      const result = await orderCollection.insertOne({
        ...parts,
      });
      res.send(result);
    });
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };

      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/order/:id", async (req, res) => {
      const id = req.params.id;
      const paymentValue = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...paymentValue,
        },
      };
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    });
    //Order collection end

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne({ ...payment });
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("hello Computer upgrade Person");
});
app.listen(port, () => {
  console.log(port, "Example port is secure running");
});
