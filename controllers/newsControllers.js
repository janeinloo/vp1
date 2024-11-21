const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config.js");
const dtEt = require("../dateTime");

const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase,
});

//@desc home page for news section
//@route GET /news
//@access private, meie puhul

const newsHome = (req, res)=>{
	console.log("Töötab uudiste router koos kontrolleriga");
	res.render("news");
};

//@desc page for adding news
//@route GET /news/addNews
//@access private, meie puhul(et oleks sisse logitud)

const addNews = (req, res)=>{
	let notice4 = "";
	let titleInput = "";
	let newsInput = "";
	let expireInput = "";
	const expirationDate = new Date();
	expirationDate.setDate(expirationDate.getDate() + 10);
	const dateOnly = expirationDate.toISOString().split('T')[0]
	res.render("addNews", {expireInput: dateOnly, notice4: notice4, titleInput: titleInput, newsInput: newsInput});
};

//@desc adding news
//@route POST /news/addNews
//@access private, meie puhul(et oleks sisse logitud)

const addingNews = (req, res)=>{
	let notice4 = "";
	let titleInput = "";
	let newsInput = "";
	let expireInput = "";
	let user = req.session.userId;

if (!user) {
	notice = "Kasutaja pole sisse logitud!";
	return res.render("addNews", {expireInput: expireInput, notice4: notice4, titleInput: titleInput, newsInput: newsInput});
	}
	
if(!req.body.titleInput || !req.body.newsInput || !req.body.expireInput){
		titleInput = req.body.titleInput;
		newsInput = req.body.newsInput;
		expireInput = req.body.expireInput;
		notice4 = "Osa andmeid sisestamata!";
		res.render("addNews", {expireInput: expireInput, notice4: notice4, titleInput: titleInput, newsInput: newsInput});
	}
	else {
		let sqlreq = "INSERT INTO vp1news (news_title, news_text, expire_date, user_id) VALUES (?,?,?,?)";
		conn.query(sqlreq, [req.body.titleInput, req.body.newsInput, req.body.expireInput, user], (err, sqlres)=>{
			if(err){
				throw err;
			}
			else {
				notice4 = "Uudis sisestatud!";
				res.render("addNews", {expireInput: expireInput, notice4: notice4, titleInput: titleInput, newsInput: newsInput});
			}
		});
	}
};

//@desc page for reading news
//@route get /news/newsdb
//@access private, meie puhul(et oleks sisse logitud)

const newsRead = (req, res)=>{
	let news = [];
	const today = dtEt.dateEt();
	const todayDay = dtEt.weekDayEt();
	const currentTime = dtEt.timeEt();
	
	let sqlReq = "SELECT news_title, news_text, news_date FROM vp1news WHERE expire_date >=? ORDER BY id DESC";
	const formattedDate = new Date().toISOString().split("T")[0];
	conn.query(sqlReq, [formattedDate], (err, results) => {
		if(err){
			throw err;
		}
		else {
			let newsList = results.map(item => ({
				news_title: item.news_title,
				news_text: item.news_text,
				news_date: dtEt.givenDateFormatted(item.news_date)
			}));
		
			res.render("newsdb", {newsList, today, todayDay, currentTime});
		}
	});
};

module.exports = {
	newsHome,
	addNews,
	addingNews,
	newsRead
};