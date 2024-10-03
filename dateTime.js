const monthNamesEt=["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni", "juuli" ,"august", "september", "oktoober", "november", "detsember"];
const weekdayNamesEt=["pühapäev", "esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev"];

const dateEt = function(){
	let timeNow = new Date();
	let dateNow = timeNow.getDate();
	let monthNow = timeNow.getMonth();
	let yearNow = timeNow.getFullYear();
	let dateNowEt = dateNow + ". " + monthNamesEt[monthNow] + " " + yearNow;
	return dateNowEt;
}

const weekDayET = function(){
	let timeNow = new Date();
	let dayNow = timeNow.getDay();
	return weekdayNamesEt[dayNow];
}

const timeFormattedET = function(){
	let timeNow = new Date();
	let hourNow = timeNow.getHours();
	let minuteNow = timeNow.getMinutes();
	let secondNow = timeNow.getSeconds();
	return hourNow + ":" + minuteNow + ":" + secondNow;
}

const partOfDay = function(){
	let dayPart = "suvaline hetk";
	let timeNow = new Date();
	let hour = timeNow.getHours();
	let day = timeNow.getDay();
	
	if (day >= 1 && day <= 5){
		if (hour >= 8 && hour < 16) {
			dayPart = "kooliaeg";
		} else if (hour >= 16 && hour < 18) {
			dayPart = "vaba aeg";
		} else if (hour >= 18 && hour < 22) {
			dayPart = "kodutööde aeg";
		} else if (hour >= 22 && hour < 8) {
			dayPart = "uneaeg";
		}
		
	} else if (day === 6) {
		if (hour >= 10 && hour < 12) {
			dayPart = "hommikusöök";
		} else if (hour >= 12 && hour <18) {
			dayPart = "vaba aeg";
		} else if (hour >= 18 && hour <23) {
			dayPart = "meelelahutus";
		} else if (hour >= 23 && hour <10) {
			dayPart = "uneaeg";
		}
	
	} else if (day === 0) {
		if (hour >= 10 && hour < 12) {
			dayPart = "hommikusöök";
		} else if (hour >= 12 && hour <15) {
			dayPart = "vaba aeg";
		} else if (hour >= 15 && hour <20) {
			dayPart = "kodutööd ja ettevalmistus";
		} else if (hour >= 20 && hour <22) {
			dayPart = "vaba aeg";
		} else if (hour >= 22 && hour <8) {
			dayPart = "uneaeg";
		}
	}
	
	return dayPart;
}
module.exports = {monthsEt: monthNamesEt, weekdaysEt: weekdayNamesEt, dateEt: dateEt, weekDayEt: weekDayET, timeEt: timeFormattedET, dayPart: partOfDay};