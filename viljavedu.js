const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
const dbInfo = require("../../vp2024config.js");
const mysql = require("mysql2");
//päringu lahti harutamiseks POST päringute puhul
const bodyparser = require("body-parser");
const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
//päringu URL-i parsimine, false, kui ainult tekst, true, kui muud ka
app.use(bodyparser.urlencoded({extended: true}));

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase,
});

app.get("/", (req, res)=>{
	res.render("viljavedu");
});

app.get("/carAdd", (req, res)=>{
	let notice = "";
	let carNumber = "";
	let carEnter = "";
	let carLeave = "";
	res.render("carAdd", {notice: notice, carNumber: carNumber, carEnter: carEnter, carLeave: carLeave});
});

app.post("/carAdd", (req, res)=>{
	let notice = "";
	let carNumber = "";
	let carEnter = "";
	let carLeave = "";
	if(!req.body.carNumberInput || !req.body.carEnterInput) {
		carNumber = req.body.carNumberInput;
		carEnter = req.body.carEnterInput;
		//carLeave = req.body.carLeaveInput; //vahepeal vajalik väljumismass hiljem sisetada kui järjekord
		notice = "Osa andmeid sisestamata!";
		res.render("carAdd", {notice: notice, carNumber: carNumber, carEnter: carEnter, carLeave: carLeave});
	}
	else {
		let sqlReq = "INSERT INTO vp1viljavedu (truck, weight_in) VALUES(?, ?)";
		conn.query(sqlReq, [req.body.carNumberInput, req.body.carEnterInput], (err, sqlres)=>{
			if(err){
				throw err;
			}
			else{
				notice = "Andmed sisestatud!";
				res.render("carAdd", {notice: notice, carNumber: carNumber, carEnter: carEnter, carLeave: carLeave});
			}
		});
	}
});



app.listen(5108);