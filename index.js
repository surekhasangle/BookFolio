import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
  database : "Library",
  host : "localhost",
  user : "postgres",
  password : "system",
  port : 5432
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

app.get("/faq", async (req, res) => {
  res.render("faq.ejs");
});
app.get("/contact", async (req, res) => {
  res.render("contact.ejs");
});

app.get("/me", async (req, res) => {
  res.render("index1.ejs");
});

app.get("/travel", async (req, res) => {
  res.render("travel.ejs");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
