import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

let sort = "id";

async function checkVisisted() {
  const result = await db.query("SELECT * FROM book ORDER BY "+ sort +" DESC");
  //`SELECT * FROM books order by ${sort} DESC`
  const books = result.rows;
  // books.forEach((book) => {
  //   const img = "https://covers.openlibrary.org/b/isbn/"+book.isbn+".jpg";
  //   //https://covers.openlibrary.org/b/isbn/978-0-439-02352-8-L.jpg
  //   console.log(img);
  //   //send this img to ejs or add in db
  // });
  
  // console.log(books);
  return books;
}

app.get("/", async (req, res) => {
  try{
    const books = await checkVisisted();
    
    res.render("index.ejs", { books: books});
  }
  catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.get("/secrets", async (req, res) => {
  console.log(req.user);//sent user here from passport middleware
  if (req.isAuthenticated()) {
    // res.render("secrets.ejs");
    //TODO: Update this to pull in the user secret to render in secrets.ejs
    try{
      const result = await db.query("SELECT secrets FROM users WHERE email = ($1) ", [req.user.email]);
      // console.log(result);
      const secret = result.rows[0].secrets;
        if (secret) {
          res.render("secrets.ejs", { secret: secret });
        } else {
          res.render("secrets.ejs", { secret: "Jack Bauer is my hero." });
        }
    }catch(err){
      console.log(err);
    }

    
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()) {
    res.render("submit.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get("/faq", async (req, res) => {
  res.render("faq.ejs");
});
app.get("/contact", async (req, res) => {
  res.render("contact.ejs");
});

app.get("/me", async (req, res) => {
  res.render("me.ejs");
});

app.get("/travel", async (req, res) => {
  res.render("travel.ejs");
});

app.post("/add", async (req, res) => {
    const result = req.body;
    console.log(result);
      try{
        await db.query("INSERT INTO book (title, description, rating, isbn, date) VALUES ($1, $2, $3, $4, $5) RETURNING *", [result.title, result.description, result.rating, result.isbn, result.date]);
        res.redirect("/");
      } catch(err){
        console.log(err);
        res.status(400).send("You Entered wrong Info");//book added  already : add costraint in db
      }
// db.end();
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/submit", async function(req, res){
  // console.log(req.user);
  const submitsecret = req.body.secret;
  // console.log(submitsecret);
  try{
    await db.query("UPDATE users SET secrets = $1 WHERE email = $2", [submitsecret, req.user.email]);
    res.redirect("/secrets");
  } catch (err) {
    console.log(err);
  }
});

app.post("/edit", async(req, res) => {
  console.log(req.body);
  const id = req.body.updated_book_id;
  const desc = req.body.updated_item_description;

  try{
    await db.query("UPDATE book SET description = ($1) WHERE id = ($2)", [desc, id]);
    res.redirect("/");
  }catch(err){
    console.log(err);
  }
});

app.post("/delete", async(req, res) => {
  // console.log(req.body);
  const id = req.body.book_id;
  try{
    await db.query("DELETE FROM book WHERE id = ($1)", [id]);
    res.redirect("/");
  }catch(err){
    console.log(err);
  }
});

app.post("/sort", async(req, res) => {
  // console.log(req.body);
  // const input = req.body.sort;
  // try{
  //   let result;
  //   if(input == "rating")
  //     result =  await db.query("SELECT * FROM book ORDER BY rating DESC");
  //   else 
  //     result =  await db.query("SELECT * FROM book ORDER BY id Desc");
  //   const books = result.rows;
  //   console.log(books);
  //   res.render("index.ejs", { books: books});
  // }catch(err){
  //   console.log(err);
  // }
  sort = req.body.sort;
  res.redirect("/");
  
  
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        // console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
