// listen on port so now.sh likes it
const { createServer } = require("http");
const https = require("https");
const axios = require("axios");
const fs = require("fs"),
	path = require("path"),
	puppeteer = require("puppeteer"),
	Twit = require("twit"),
	//   polkadotInfo = require('./rewardCalculation'),
	config = require("./config");
const mongoose = require("mongoose");
const Validator = require("./Validator");
// Initialize bot
const bot = new Twit(config.twitterKeys);
const EventEmitter = require("events");
const eraChange = new EventEmitter();

let previousEra = 0;
let currentEra = 0;
console.log("🎉 twitter bot running 🎉");
let topValidatorData = {};
let topNominatorData = {};

const Sentry = require("@sentry/node");
Sentry.init({
	dsn: "https://0fe83f6a410e4acdb2be9d953030e021@sentry.io/1885487",
});

// const eraChange = polkadotInfo.eraChange;
// const retweet = require("./api/retweet");
// const reply = require("./api/reply");
//yo

async function getValidators() {
	//Get top three validators with highest pool reward without commission,
	//removing all validators where poolRewardWithCommission equals Not enough data
	const result = await Validator.find()
		.where("poolRewardWithCommission")
		.ne("Not enough data")
		.sort("-poolRewardWithCommission")
		.limit(3);

	return result;
}

async function getTopThreeBackedValidatorsByNominators() {
	const result = await Validator.find()
		.sort("-noOfNominators")
		.limit(3);

	return result;
}

const getNominatorsData = async () => {
	try {
		return await axios.get(
			"https://yieldscan-api.onrender.com/api/twitter/top-nominator"
		);
	} catch (error) {
		console.error(error);
	}
};

async function takeScreenShotOfTopThreeBackedValidatorsByNominators() {
	const validator = await getTopThreeBackedValidatorsByNominators();
	await takeScreenShot(
		__dirname + "/images/" + validator[0].stashId + ".png",
		"https://polkanalytics.com/#/kusama/validator/" + validator[0].stashId,
		".konvajs-content",
		true
	);

	await takeScreenShot(
		__dirname + "/images/" + validator[1].stashId + ".png",
		"https://polkanalytics.com/#/kusama/validator/" + validator[1].stashId,
		".konvajs-content",
		true
	);

	await takeScreenShot(
		__dirname + "/images/" + validator[2].stashId + ".png",
		"https://polkanalytics.com/#/kusama/validator/" + validator[2].stashId,
		".konvajs-content",
		true
	);
	//   console.log('test, end');
	return validator;
}

async function postTopThreeBackedValidatorsByNominatorsOnTwitter() {
	const validator = await takeScreenShotOfTopThreeBackedValidatorsByNominators();
	fs.readdir(__dirname + "/images", (err, files) => {
		if (err) {
			throw err;
		} else {
			console.log("files", files);
			//Only take the top validators screenshot
			const fileImages = files.filter(
				(file) => validator[0].stashId === file.split(".")[0]
			);
			console.log("fileImages", fileImages);
			postOnTwitter(fileImages, validator);
		}
	});

	function postOnTwitter(images, validator) {
		console.log("Opening the image...");

		function uploadImg(image) {
			return new Promise((resolve, reject) => {
				let image_path = path.join(__dirname, "/images/" + image);
				let imageFile = fs.readFileSync(image_path, { encoding: "base64" });
				bot.post(
					"media/upload",
					{ media_data: imageFile },
					(err, data, res) => {
						if (err) {
							reject(err);
						} else {
							console.log("Image successfully uploaded!");
							console.log("data", data);
							resolve(data.media_id_string);
						}
					}
				);
			});
		}

		console.log("Uploading an image...");

		Promise.all([uploadImg(images)])
			.then((list) => {
				console.log("list", list);
				bot
					.post("statuses/update", {
						status: `Most Backed Validator Leaderboard for previous era on @kusamanetwork

  🥇${validator[0].noOfNominators} backers on ${validator[0].name}
  🥈${validator[1].noOfNominators} backers on ${validator[1].name}
  🥉${validator[2].noOfNominators} backers on ${validator[2].name}

See how many nominators are backing validators on polkanalytics.com`,
						media_ids: list,
					})
					.catch((err) => {
						console.log("twit bot err", err);
					});
			})
			.catch((err) => {
				console.log("err", err);
			});
	}
}

async function takeScreenShots() {
	//   console.log('test, start');
	const validator = topValidatorData;
	await takeScreenShot(
		__dirname + "/images/" + validator.stashId + ".png",
		"https://polkabot-twitter.netlify.app/#/top-validator",
		".konvajs-content",
		true
	);

	// await takeScreenShot(
	// 	__dirname + "/images/" + validator[1].stashId + ".png",
	// 	"https://polkanalytics.com/#/kusama/validator/" + validator[1].stashId,
	// 	".konvajs-content",
	// 	true
	// );

	// await takeScreenShot(
	// 	__dirname + "/images/" + validator[2].stashId + ".png",
	// 	"https://polkanalytics.com/#/kusama/validator/" + validator[2].stashId,
	// 	".konvajs-content",
	// 	true
	// );
	//   console.log('test, end');
	return validator;
}

async function takeNomScreenShots() {
	//   console.log('test, start');
	const nominator = await getNominatorsData();

	await takeScreenShot(
		__dirname + "/images/" + nominator.data.nomId + ".png",
		"https://polkabot-twitter.netlify.app/#/top-nominator",
		".konvajs-content",
		true
	);

	// await takeScreenShot(
	// 	__dirname + "/images/" + validator[1].stashId + ".png",
	// 	"https://polkanalytics.com/#/kusama/validator/" + validator[1].stashId,
	// 	".konvajs-content",
	// 	true
	// );

	// await takeScreenShot(
	// 	__dirname + "/images/" + validator[2].stashId + ".png",
	// 	"https://polkanalytics.com/#/kusama/validator/" + validator[2].stashId,
	// 	".konvajs-content",
	// 	true
	// );
	//   console.log('test, end');
	return nominator.data;
}

async function takeValidatorScreenShotsAndPostItOnTwitter() {
	const validator = await takeScreenShots();
	fs.readdir(__dirname + "/images", (err, files) => {
		if (err) {
			throw err;
		} else {
			console.log("files", files);
			const fileImages = files.find(
				(imageName) => imageName.split(".")[0] === validator.stashId
			);
			console.log("fileImages", fileImages);
			uploadImages(fileImages, validator);
		}
	});
}

async function takeNominatorScreenShotsAndPostItOnTwitter() {
	const nominator = await takeNomScreenShots();
	fs.readdir(__dirname + "/images", (err, files) => {
		if (err) {
			throw err;
		} else {
			console.log("files", files);
			const fileImages = files.find(
				(imageName) => imageName.split(".")[0] === nominator.nomId
			);
			console.log("fileImages", fileImages);
			uploadNomImages(fileImages, nominator);
		}
	});
}

eraChange.on("newEra", async () => {
	try {
		console.log("era func start");
		await takeValidatorScreenShotsAndPostItOnTwitter();
		await takeNominatorScreenShotsAndPostItOnTwitter();
		// await postTopThreeBackedValidatorsByNominatorsOnTwitter();
		console.log("era func end");
	} catch (err) {
		console.log(err);
	}
});

const main = async () => {
	axios
		.get("https://yieldscan-api.onrender.com/api/twitter/top-validator")
		.then(({ data }) => {
			currentEra = data[0].eraIndex;
			topValidatorData = data[0];
			// && previousEra !== 0
			if (currentEra > previousEra && previousEra !== 0) {
				//   Sentry.captureMessage(`Era changed at: ${new Date()}`);
				eraChange.emit("newEra");
			}
			previousEra = currentEra;
			console.log("waiting for new era...");
		})
		.catch(() => console.log("database failed retrieve data"));
};

setInterval(() => {
	main().catch((err) => {
		console.log(err);
		process.exit(1);
	});
}, 10 * 60 * 1000);

// This will allow the bot to run on now.sh
const server = createServer((req, res) => {
	res.writeHead(200);
	res.end("twitter bot api");
});
const PORT = process.env.PORT || 3000;
server.listen(PORT);

// Function to take a screenshot of given URL, waiting for the element to load
async function takeScreenShot(
	outputPath,
	validatorUrl,
	waitForElement,
	fullPage
) {
	console.log("Launching chromium");
	const browser = await puppeteer.launch({
		args: ["--no-sandbox"],
		headless: true,
		ignoreHTTPSErrors: true,
	});
	const page = await browser.newPage();

	console.log("validatorUrl", validatorUrl);
	console.log("Accessing URL...");
	try {
		await page.goto(validatorUrl, {
			waitUntil: "load",
			// Remove the timeout
			timeout: 0,
		});
		await page.setViewport({ width: 1012, height: 506 });
	} catch (error) {
		console.log(error);
	}
	console.log("Waiting for page to load...");
	await page.waitForSelector(waitForElement, { timeout: 300000 });
	// await page.focus("[aria-label='Switch to dark mode']");
	// await page.waitFor(2000);
	// await page.click("[aria-label='Switch to dark mode']");
	// await page.focus("body");
	await page.waitFor(5000);
	await page.click("body");
	await page.screenshot({ path: outputPath, fullPage: fullPage });
	console.log("Screenshot taken!");

	await browser.close();
}

async function uploadImages(images, validator) {
	console.log("Opening the image...");

	let actorIdentity =
		validator.info[0].twitter !== null
			? validator.info[0].twitter
			: validator.info[0].display !== null
			? validator.info[0].display.length > 11
				? validator.info[0].display.slice(0, 5) +
				  "..." +
				  validator.info[0].display.slice(-5)
				: validator.info[0].display
			: validator.stashId.length > 11
			? validator.stashId.slice(0, 5) + "..." + validator.stashId.slice(-5)
			: validator.stashId;

	const poolReward = validator.estimatedPoolReward.toFixed(3);
	// console.log(poolReward);

	const subPoolReward = await convertCurrency(poolReward, "kusama").then(
		(convertedValue) => convertedValue
	);
	// console.log("subPoolReward");
	// console.log(subPoolReward);

	function uploadImg(image) {
		return new Promise((resolve, reject) => {
			let image_path = path.join(__dirname, "/images/" + image);
			let imageFile = fs.readFileSync(image_path, { encoding: "base64" });
			bot.post("media/upload", { media_data: imageFile }, (err, data, res) => {
				if (err) {
					reject(err);
				} else {
					console.log("Image successfully uploaded!");
					// console.log("data", data);
					resolve(data.media_id_string);
				}
			});
		});
	}

	console.log("Uploading an image...");

	Promise.all([
		uploadImg(images),
		// uploadImg(images[1]),
		// uploadImg(images[2]),
	])
		.then((list) => {
			// console.log("list", list);
			bot
				.post("statuses/update", {
					status: `${actorIdentity}'s pool was the highest earning validator pool for the previous era on @kusamanetwork with ${poolReward} KSM ($${subPoolReward.toFixed(
						2
					)}) earned.`,
					media_ids: list,
				})
				.catch((err) => {
					console.log("twit bot err", err);
				});
		})
		.catch((err) => {
			console.log("err", err);
		});
}

async function uploadNomImages(images, nominator) {
	console.log("Opening the image...");

	// let actorIdentity =
	// 	validator.info[0].twitter !== null
	// 		? `@${validator.info[0].twitter}`
	// 		: validator.info[0].display !== null
	// 		? validator.info[0].display.length > 11
	// 			? validator.info[0].display.slice(0, 5) +
	// 			  "..." +
	// 			  validator.info[0].display.slice(-5)
	// 			: validator.info[0].display
	// 		: validator.stashId.length > 11
	// 		? validator.stashId.slice(0, 5) + "..." + validator.stashId.slice(-5)
	// 		: validator.stashId;

	const actorIdentity =
		nominator.nomId.length > 11
			? nominator.nomId.slice(0, 5) + "..." + nominator.nomId.slice(-5)
			: nominator.nomId;

	const nomReward = nominator.nomEraReward.toFixed(3);
	// console.log(nomReward);

	const subPoolReward = await convertCurrency(nomReward, "kusama").then(
		(convertedValue) => convertedValue
	);
	// console.log("subPoolReward");
	// console.log(subPoolReward);

	// console.log(images);

	function uploadNomImg(image) {
		return new Promise((resolve, reject) => {
			let image_path = path.join(__dirname, "/images/" + image);
			let imageFile = fs.readFileSync(image_path, { encoding: "base64" });
			bot.post("media/upload", { media_data: imageFile }, (err, data, res) => {
				if (err) {
					reject(err);
				} else {
					console.log("Image successfully uploaded!");
					console.log("data", data);
					resolve(data.media_id_string);
				}
			});
		});
	}

	console.log("Uploading an image...");

	Promise.all([
		uploadNomImg(images),
		// uploadImg(images[1]),
		// uploadImg(images[2]),
	])
		.then((list) => {
			console.log("list", list);
			bot
				.post("statuses/update", {
					status: `${actorIdentity} was the highest earning nominator for the previous era on @kusamanetwork with ${nomReward} KSM ($${subPoolReward.toFixed(
						2
					)}) earned.`,
					media_ids: list,
				})
				.catch((err) => {
					console.log("twit bot err", err);
				});
		})
		.catch((err) => {
			console.log("err", err);
		});
}

const convertCurrency = async (value, network) => {
	const res = await axios(
		"https://api.coingecko.com/api/v3/simple/price?ids=kusama%2Cpolkadot&vs_currencies=usd"
	);
	const { kusama, polkadot } = res.data;
	let convertedValue = null;
	if (network === "kusama") {
		convertedValue = value * kusama.usd;
	}
	if (network === "polkadot") convertedValue = value * polkadot.usd;
	return convertedValue;
};
