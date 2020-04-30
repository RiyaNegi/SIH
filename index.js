// express setup
var express = require("express");
var path = require("path");
var serveStatic = require("serve-static");
var app = express();
app.use(serveStatic(path.join(__dirname, "views")));
var bodyParser = require("body-parser");
app.use(bodyParser.json());
const port = 8000;
// parse request body
app.use(express.urlencoded());

app.use(express.static("public"));

// hbs setup
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

// MySQL Setup
var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "sih"
});

connection.connect();
util = require("util");
connection.query = util.promisify(connection.query);

app.get("/", async function(req, res) {
  items = await connection.query(`SELECT * FROM product`);
  console.log("items:", items);
  people = await connection.query(`SELECT * FROM people`);
  cartItems = await connection.query(
    `SELECT people.id AS person_id, quantity, cost FROM cart RIGHT JOIN people ON cart.person_id = people.id INNER JOIN product ON product.id = cart.product_id`
  );

  people = people.map(person => {
    cartSubtotal = 0;
    cartItems.forEach(item => {
      console.log("inside");
      if (item.person_id == person.id)
        cartSubtotal += item.quantity * item.cost;
    });
    return { ...person, cartSubtotal: cartSubtotal };
  });
  console.log("people:", people);
  res.render("home", { items: items, people: people });
});

app.get("/cart", async function(req, res) {
  personId = req.param("personId");
  console.log(personId);
  cartItems = await connection.query(
    `SELECT product.name AS product_name, people.name AS person_name, quantity, cost FROM cart INNER JOIN people INNER JOIN product ON product.id = cart.product_id AND people.id = cart.person_id WHERE cart.person_id = ${personId}`
  );
  cartSubtotal = 0;
  cartItems = cartItems.map(item => {
    cartSubtotal += item.quantity * item.cost;
    return { ...item, subtotal: item.quantity * item.cost };
  });
  res.render("cart", { cartItems: cartItems, cartSubtotal });
});

app.post("/shelves", async function(req, res) {
  person_name = await connection.query(
    `SELECT name from people WHERE name="${req.body.name}"`
  );
  console.log(req.body.name);
  if (person_name.length === 0) {
    person_name = await connection.query(
      `INSERT INTO people(name)  values("${req.body.name}")`
    );
    personId = await connection.query(
      `UPDATE shelves SET person_id = (SELECT id FROM people WHERE name="${req.body.name}")`
    );
  } else person_id = await connection.query(`UPDATE shelves SET person_id = (SELECT id FROM people WHERE name="${req.body.name}")`);

  res.json({ status: 200 });
});

app.post("/cart", async function(req, res) {
  userId = await connection.query(`SELECT person_id FROM shelves`);
  console.log("userid:", userId[0].person_id);
  user = await connection.query(
    `SELECT person_id FROM cart WHERE person_id=${userId[0].person_id}`
  );
  if (user.length === 0) {
    cart = await connection.query(
      `INSERT INTO cart(person_id,product_id,quantity) values(${userId[0].person_id}, 1, ${req.body.quantity})`
    );
  } else {
    cart = await connection.query(
      `UPDATE cart SET person_id=${userId[0].person_id},product_id =1,quantity=quantity+${req.body.quantity} WHERE person_id=${userId[0].person_id}`
    );
  }
  console.log(req.body.quantity);
  res.json({ status: 200 });
});

app.listen(port);
console.log("App listening on port 8000!");
