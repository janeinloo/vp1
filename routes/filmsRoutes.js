const express = require("express");
const router = express.Router(); //suur R on oluline. Expressis on foon Router ja see peab olema suurega.
const general = require("../generalFnc");
const async = require("async");

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

//kõikidele marsuutidele ühine vahevara (middleware)
router.use(general.checkLogin);

//kontrollerid
const {
	filmsHome,
	actorsRead,
	filmRelations,
	filmAddRelations} = require("../controllers/filmsControllers");

//igale marsuudile oma osa nagu seni index failis.

//app.get("/eestifilm", (req, res)=>{
	
router.route("/").get(filmsHome);

router.route("/tegelased").get(actorsRead);

router.route("/addRelations").post(filmAddRelations);

router.route("/addRelations").get(filmRelations);

module.exports = router;