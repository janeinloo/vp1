const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
const dbInfo = require("../../vp2024config.js");
const mysql = require("mysql2");
//päringu lahti harutamiseks POST päringute puhul
const bodyparser = require("body-parser");
//failide üleslaadimiseks
const multer = require("multer");
//pildimanipulatsiooniks (suuruse muutmine)
const sharp = require("sharp");
//parooli krüpteerimiseks
const bcrypt = require("bcrypt");
//sessioonihaldur
const session = require("express-session");
const async = require("async");

const app = express();
app.use(session({secret: "minuAbsoluutseltSalajaneAsi", saveUninitialized: true, resave: true}));

app.use((req, res, next) => {
    res.locals.user = req.session.userId
        ? {
            id: req.session.userId,
            firstName: req.session.firstName,
            lastName: req.session.lastName
        }
        : null;
    next();
});

app.set("view engine", "ejs");
app.use(express.static("public"));
//päringu URL-i parsimine, false, kui ainult tekst, true, kui muud ka
app.use(bodyparser.urlencoded({extended: true}));
//seadistame vahevara multer fotode laadimiseks kindlasse kataloogi
const upload = multer({dest: "./public/gallery/orig/"});

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase,
});

const checkLogin = function(req, res, next){
	if(req.session != null){
		if(req.session.userId){
			console.log("Kasutaja on sisselogitud!" + req.session.userId + " " + req.session.firstName + " " + req.session.lastName);
			next();
		}
		else {
			console.log("Login not detected");
			res.redirect("/signin");
		}
	}
	else {
		console.log("Session not detected");
		res.redirect("/signin");
	}
}

app.get("/", (req, res)=>{
	//res.send("Express läks täiesti käima!");
	//res.render("index.ejs");
	res.render("index",{days: dtEt.daysBetween("9-2-2024")});
});

app.get("/signin", (req, res)=>{
	let notice = "";
	res.render("signin",{notice: notice});
});

app.post("/signin", (req, res)=>{
	let notice = "";
	if(!req.body.emailInput || req.body.passwordinput){
		console.log("Andmeid puudu!");
		notice = "Sisselogimise andmeid on puudu!";
		res.render("signin",{notice: notice});
	}
	else {
		let sqlReq = "SELECT id, password, first_name, last_name FROM vp1users WHERE email = ?";
		conn.execute(sqlReq, [req.body.emailInput], (err, result)=>{
			if(err){	
				console.log("Viga andmebaasist lugemisel!" +err);
				notice = "Tehniline viga, sisselogimine ebaõnnestus!";
				res.render("signin",{notice: notice});
			}
			else {
				if(result[0] != null){
					//kasutaja on olemas
					bcrypt.compare(req.body.passwordInput, result[0].password, (err, compareresult)=>{
						if(err){
							notice = "Tehniline viga, sisselogimine ebaõnnestus!";
							res.render("signin",{notice: notice});
						}
						else {
							//kas õige või vale parool
							if(compareresult){
								//notice = "Oled sisse loginud!";
								//res.render("signin",{notice: notice}); need olid enne homepage sisselogides
								req.session.userId = result[0].id;
								req.session.firstName = result[0].first_name;
								req.session.lastName = result[0].last_name;
								res.redirect("/home");
							}//automaatselt true, ei pea == True panema
							else {
							notice = "Kasutajatunnus ja/või parool on vale!";
							res.render("signin",{notice: notice});
							}
						}
					});
				}
				else {
					notice = "Kasutajatunnus või parool on vale!";
					res.render("signin",{notice: notice});
				}
			}
		});//conn execute lõppeb
	}
	//res.render("index",{days: dtEt.daysBetween("9-2-2024")});
});

app.get("/home", checkLogin, (req, res)=>{
	console.log("Sees on kasutaja: " + req.session.userId + " " + req.session.firstName + " " + req.session.lastName);
	res.render("home");
});

app.get("/logout", (req, res)=>{
	req.session.destroy();
	console.log("Välja logitud");
	res.redirect("/");
});


app.get("/timenow", (req, res)=>{
	const weekdayNow = dtEt.weekDayEt();
	const dateNow = dtEt.dateEt();
	const timeNow = dtEt.timeEt();
	res.render("timenow", {nowWD: weekdayNow, nowD: dateNow, nowT: timeNow});
});

app.get("/signup", (req, res)=>{
	res.render("signup");
});

app.post("/signup", (req, res)=>{
	let notice = "Ootan andmeid";
	const { firstNameInput, lastNameInput, birthDateInput, genderInput, emailInput, passwordInput, confirmPasswordInput } = req.body;
	console.log(req.body);
	
	if(!req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput || !req.body.genderInput || !req.body.emailInput || req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput){
		console.log("Andmeid on puudu või paroolid ei kattu!");
		notice = "Andmeid on puudu, parool liiga lühike või paroolid ei kattu!";
		res.render("signup", {notice: notice}); //kui andmetes viga ... lõppeb
	} else {
		// kontrollime, kas sellise e-mailiga kasutaja on juba olemas
		const checkEmail = "SELECT id FROM vp1users WHERE email = ?";
		conn.execute(checkEmail, [req.body.emailInput], (err, result) => {
			if (err) {
				notice = "Tehniline viga, kasutajat ei loodud!";
				res.render("signup", {notice: notice});
			} else if (result[0] != null) {
				notice = "Sellise emailiga kasutaja on juba olemas!";
				res.render("signup", {notice: notice});
			} else {
				notice = "Andmed sisestatud!";
				//loome parooliräsi jaoks "soola"
				bcrypt.genSalt(10, (err, salt)=> {
					if(err){
						notice = "Tehniline viga, kasutajat ei loodud!";
						res.render("signup", {notice: notice});
					}
					else {
						//krüpteerime
						bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash)=>{
							if(err){
								notice = "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud!";
								res.render("signup", {notice: notice});
							}
							else {
								let sqlReq = "INSERT INTO vp1users (first_name, last_name, birth_date, gender, email, password) VALUES(?,?,?,?,?,?)";
								conn.execute(sqlReq, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result)=>{
									if(err){
										notice = "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud!";
										res.render("signup", {notice: notice});
									}
									else {
										notice = "Kasutaja " + req.body.emailInput + "edukalt loodud!";
										res.render("signup", {notice: notice});
									}
								});//conn.execute lõpp
							}
						});//hash lõppeb
					}
				});//genSalt lõppeb
			}//kui andmed korras, lõppeb
		});
	}
	//res.render("signup");
});

app.get("/vanasonad", (req, res)=>{
	let folkWisdom = [];
	fs.readFile("public/textfiles/vanasonad.txt", "utf8", (err, data)=>{
		if(err){
			//throw err;
			res.render("justlist", {h2: "Vanasõnad", listData: ["Ei leidnud ühtegi vanasõna"]});
		}
		else {
			folkWisdom = data.split(";");
			res.render("justlist", {h2: "Vanasõnad", listData: folkWisdom});
		}
	});
});

app.get("/regvisit", (req, res)=>{
	res.render("regvisit");
});

app.post("/regvisit", (req, res)=>{
	const dateNow = dtEt.dateEt();
	const timeNow = dtEt.timeEt();
	console.log(req.body);
	fs.open("public/textfiles/visitlog.txt", "a", (err, file)=>{
		if(err){
			throw err;
		}
		else {
			fs.appendFile("public/textfiles/visitlog.txt", req.body.firstNameInput + " " + req.body.lastNameInput + ", külastas" + dateNow + "kell" + timeNow + ";",(err)=>{
				if(err){
					throw err;
				}
				else {
					console.log("Faili kirjutati!");
					res.render("regvisit");
				}
			});
		}
	});
});

app.get("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
});

app.post("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	if(!req.body.firstNameInput || !req.body.lastNameInput){
		firstName = req.body.firstNameInput;
		lastName = req.body.lastNameInput;
		notice = "Osa andmeid sisestamata!";
		res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
	}
	else {
		let sqlreq = "INSERT INTO vp1visitlog (first_name, last_name) VALUES(?,?)";
		conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err, sqlres)=>{
			if(err){
				throw err;
			}
			else {
				notice = "Külastus registreeritud!";
				res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
			}
		});
	}
});

app.get("/regvisitadd", (req, res)=>{
	let notice1 = "";
	let notice2 = "";
	let notice3 = "";
	let firstName = "";
	let lastName = "";
	let movieTitle = "";
	let positionName = "";
	res.render("regvisitadd", {notice1: notice1, notice2: notice2, notice3: notice3, firstName: firstName, lastName: lastName, movieTitle: movieTitle, positionName: positionName,});
});

app.post("/personSubmit", (req, res)=>{
	let notice1 = "";
	let notice2 = "";
	let notice3 = "";
	let firstName = "";
	let lastName = "";
	let movieTitle = "";
	let positionName = "";
	if(!req.body.firstNameInput || !req.body.lastNameInput){
		firstName = req.body.firstNameInput;
		lastName = req.body.lastNameInput;
		notice1 = "Osa andmeid sisestamata!";
		res.render("regvisitadd", {notice1: notice1, notice2: notice2, notice3: notice3, firstName: firstName, lastName: lastName, movieTitle: movieTitle, positionName: positionName,});
	}
	else {
		let sqlreq = "INSERT INTO filmitegelane (first_name, last_name) VALUES(?,?)";
		conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err, sqlres)=>{
			if(err){
				throw err;
			}
			else {
				notice1 = "Sisestus registreeritud!";
				res.render("regvisitadd", {notice1: notice1, notice2: notice2, notice3: notice3, firstName: firstName, lastName: lastName, movieTitle: movieTitle, positionName: positionName,});
			}
		});
	}
});

app.post("/movieSubmit", (req, res)=>{
	let notice1 = "";
	let notice2 = "";
	let notice3 = "";
	let firstName = "";
	let lastName = "";
	let movieTitle = "";
	let positionName = "";
	if(!req.body.movieTitleInput){
		movieTitle = req.body.movieTitleInput;
		notice2 = "Osa andmeid sisestamata!";
		res.render("regvisitadd", {notice1: notice1, notice2: notice2, notice3: notice3, firstName: firstName, lastName: lastName, movieTitle: movieTitle, positionName: positionName,});
	}
	else {
		let sqlreq = "INSERT INTO movie_title (title) VALUES(?)";
		conn.query(sqlreq, [req.body.movieTitleInput], (err, sqlres)=>{
			if(err){
				throw err;
			}
			else {
				notice2 = "Sisestus registreeritud!";
				res.render("regvisitadd", {notice1: notice1, notice2: notice2, notice3: notice3, firstName: firstName, lastName: lastName, movieTitle: movieTitle, positionName: positionName,});
			}
		});
	}
});

app.post("/roleSubmit", (req, res)=>{
	let notice1 = "";
	let notice2 = "";
	let notice3 = "";
	let firstName = "";
	let lastName = "";
	let movieTitle = "";
	let positionName = "";
	if(!req.body.positionNameInput){
		positionName = req.body.positionNameInput;
		notice3 = "Osa andmeid sisestamata!";
		res.render("regvisitadd", {notice1: notice1, notice2: notice2, notice3: notice3, firstName: firstName, lastName: lastName, movieTitle: movieTitle, positionName: positionName,});
	}
	else {
		let sqlreq = "INSERT roll (roll) VALUES(?)";
		conn.query(sqlreq, [req.body.positionNameInput], (err, sqlres)=>{
			if(err){
				throw err;
			}
			else {
				notice3 = "Sisestus registreeritud!";
				res.render("regvisitadd", {notice1: notice1, notice2: notice2, notice3: notice3, firstName: firstName, lastName: lastName, movieTitle: movieTitle, positionName: positionName,});
			}
		});
	}
});

app.get("/visitorsdb", (req, res)=>{
	let visitors = [];
	let sqlReq = "SELECT first_name, last_name FROM vp1visitlog";
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			visitors = sqlres;
			res.render("visitorsdb", {h2: "Külastajad", visitors: visitors});
		}
	});
});

app.get("/gallery", checkLogin, (req, res)=>{
	let sqlReq = "SELECT file_name, alt_text FROM vp1photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC";
	const privacy = 3;
	let photoList = [];
	conn.query(sqlReq, [privacy], (err, result)=>{
		if(err){
			throw err;
		}
		else {
			console.log(result);
			for(let i = 0; i < result.length; i ++) {
				photoList.push({href: "/gallery/thumbnail/" + result[i].file_name, alt: result[i].alt_text, fileName: result[i].file_name});
			}
			res.render("gallery", {listData: photoList});
		}
	});
	//res.render("gallery");
});

const newsRouter = require("./routes/newsRoutes");
app.use("/news", newsRouter);

app.get("/eestifilm", checkLogin, (req, res)=>{
	res.render("filmindex");
});

app.get("/eestifilm/addRelations", checkLogin, (req, res)=>{
	//võtan kasutusele async mooduli, et korraga teha mitu andmebaasipäringut
	const filmQueries = [
		function(callback){
			let sqlReq1 = "SELECT id, first_name, last_name, birth_date FROM person";
			conn.execute(sqlReq1, (err, result)=>{
				if (err){
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			let sqlReq2 = "SELECT id, title, production_year FROM movie";
			conn.execute(sqlReq2, (err, result)=>{
				if (err){
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		},
		function(callback){
			let sqlReq3 = "SELECT id, position_name FROM position";
			conn.execute(sqlReq3, (err, result)=>{
				if (err){
					return callback(err);
				}
				else {
					return callback(null, result);
				}
			});
		}
	];
	//paneme need päringud ehk siis funktsioonid paralleelselt käima, tulemuseks saame kolme päringu koondi
	async.parallel(filmQueries, (err, results)=>{
		if(err){
			throw err;
		}
		else {
			console.log(results);
			res.render("addRelations", {personList: results[0], movieList: results[1], positionList: results[2]});
		}
	});
	//res.render("addRelations");
});

app.post("/eestifilm/addRelations", checkLogin, (req, res)=>{
	let notice = "";
	console.log(req.body);
	const {personSelect, movieSelect, positionSelect, roleInput} = req.body;
	
	if (!personSelect || !movieSelect || !positionSelect || !roleInput) {
		notice = "Osa andmeid sisestamata!"
		return res.render("addRelations", {notice});
	}
	else {
		let sqlReq = "INSERT INTO person_in_movie (person_id, movie_id, position_id, role) VALUES (?, ?, ?, ?)";
		conn.execute(sqlReq, [personSelect, movieSelect, positionSelect, roleInput || null], (err) => {
			if (err) {
				throw err;
			}
			else {
				res.redirect("addRelations");
			}
		});
	}
	
});

app.get("/eestifilm/tegelased", checkLogin, (req, res)=>{
	let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
	let persons = [];
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			for (let i=0; i<sqlres.length; i++) 
			persons.push({first_name: sqlres[i].first_name, last_name: sqlres[i].last_name, birth_date: dtEt.givenDateFormatted(sqlres[i].birth_date)});
			console.log();
			
			res.render("tegelased", {persons: persons});
		}
	});
	//res.render("tegelased");
});

app.get("/photoupload", checkLogin, (req, res)=>{
	let notice5 = "";
	res.render("photoupload", {notice5: notice5});
});

app.post("/photoupload", checkLogin, upload.single("photoInput"), (req, res)=>{
	console.log(req.body);
	console.log(req.file);
	let notice5 = "";
	//genereerin oma faili nime
	const fileName = "vp_" + Date.now() + ".jpg";
	//nimetame üleslaetud faili ümber
	const user_id = req.session.userId;
	
	if (!user_id) {
		notice = "Kasutaja pole sisse logitud!";
		return res.render("photoupload", {notice});
	}
	fs.rename(req.file.path, req.file.destination + fileName, (err)=>{
		console.log(err);
	});
	//teeme 2 erisuurust
	sharp(req.file.destination + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName);
	sharp(req.file.destination + fileName).resize(100,100).jpeg({quality: 90}).toFile("./public/gallery/thumbnail/" + fileName);
	//salvestame andmebaasi
	let sqlReq = "INSERT INTO vp1photos (file_name, orig_name, alt_text, privacy, user_id) VALUES (?,?,?,?,?)";
	
	conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, user_id], (err, result)=>{
		if (err){
			throw err;
		}
		else {
			notice5 = "Pilt üles laetud!";
			res.render("photoupload", {notice5: notice5});
		}
	});
	//res.render("photoupload"); enne oli siin nüüd peale else
});

app.listen(5108);