const express = require("express");
const router = express.Router(); //suur R on oluline. Expressis on foon Router ja see peab olema suurega.
const general = require("../generalFnc");

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
	newsHome,
	addNews,
	addingNews,
	newsRead} = require("../controllers/newsControllers");


//igale marsuudile oma osa nagu seni index failis.

//app.get("/news", (req, res)=>{
router.route("/").get(newsHome);

router.route("/addNews").get(addNews);

router.route("/addNews").post(addingNews);

router.route("/newsdb").get(newsRead);

module.exports = router;