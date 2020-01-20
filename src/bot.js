// listen on port so now.sh likes it
const { createServer } = require("http");
const https = require("https");
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
const { ApiPromise, WsProvider } = require("@polkadot/api");
const EventEmitter = require("events");
const eraChange = new EventEmitter();

const Sentry = require("@sentry/node");
Sentry.init({
	dsn: "https://0fe83f6a410e4acdb2be9d953030e021@sentry.io/1885487"
});

// const eraChange = polkadotInfo.eraChange;
// const retweet = require("./api/retweet");
// const reply = require("./api/reply");
//yo
mongoose
	.connect(
		config.dbUrl,
		{ useNewUrlParser: true, useUnifiedTopology: true }
	)
	.then(() => console.log("connected to database"))
	.catch(() => console.log("database failed to connect"));

async function getValidators() {
	const result = await Validator.find()
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
				file => validator[0].stashId === file.split(".")[0]
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
			.then(list => {
				console.log("list", list);
				bot
					.post("statuses/update", {
            status: `Most Backed Validator Leaderboard for previous era on @kusamanetwork

  🥇${validator[0].noOfNominators} backers on ${validator[0].name}
  🥈${validator[1].noOfNominators} backers on ${validator[1].name}
  🥉${validator[2].noOfNominators} backers on ${validator[2].name}

See how many nominators are backing validators on polkanalytics.com`,
						media_ids: list
					})
					.catch(err => {
						console.log("twit bot err", err);
					});
			})
			.catch(err => {
				console.log("err", err);
			});
	}
}

async function takeScreenShots() {
	//   console.log('test, start');
	const validator = await getValidators();

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

async function takeScreenShotsAndPostItOnTwitter() {
	const validator = await takeScreenShots();
	console.log("validator", validator);
	fs.readdir(__dirname + "/images", (err, files) => {
		if (err) {
			throw err;
		} else {
			console.log("files", files);
			const fileImages = validator.map(validator => {
				const id = files.find(
					imageName => imageName.split(".")[0] === validator.stashId
				);
				return id;
			});
			console.log("fileImages", fileImages);
			uploadImages(fileImages, validator);
		}
	});
}

eraChange.on("newEra", async () => {
	try {
		console.log("era func start");
		await takeScreenShotsAndPostItOnTwitter();
		await postTopThreeBackedValidatorsByNominatorsOnTwitter();
		console.log("era func end");
	} catch (err) {
		console.log(err);
	}
});

(async () => {
	const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
	const api = await ApiPromise.create({ provider: wsProvider });

	await api.derive.session.info(header => {
		const eraProgress = header.eraProgress.toString();
		// console.log(eraLength,eraProgress,sessionLength,sessionProgress)
		if (parseInt(eraProgress) === 150) {
			//   Sentry.captureMessage(`Era changed at: ${new Date()}`);
			eraChange.emit("newEra");
		}
		console.log(`eraProgress ${parseInt(eraProgress)}`);
	});
})();

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
	const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
	const page = await browser.newPage();

	console.log("validatorUrl", validatorUrl);
	console.log("Accessing URL...");
	await page.goto(validatorUrl);
	await page.setViewport({ width: 1920, height: 1080 });
	console.log("Waiting for page to load...");
	await page.waitForSelector(waitForElement, { timeout: 3000000 });
	await page.focus("[aria-label='Switch to dark mode']");
	await page.waitFor(2000);
	await page.click("[aria-label='Switch to dark mode']");
	await page.focus("body");
	await page.waitFor(2000);
	await page.click("body");
	await page.screenshot({ path: outputPath, fullPage: fullPage });
	console.log("Screenshot taken!");

	await browser.close();
}

function uploadImages(images, validator) {
	console.log("Opening the image...");

	function uploadImg(image) {
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
		uploadImg(images[0]),
		uploadImg(images[1]),
		uploadImg(images[2])
	])
		.then(list => {
			console.log("list", list);
			bot
				.post("statuses/update", {
          status: `Highest Pool Reward Validator Leaderboard for previous era on @kusamanetwork

  🥇${parseFloat(validator[0].poolRewardWithCommission).toFixed(3)} KSM for ${
						validator[0].name
					}
  🥈${parseFloat(validator[1].poolRewardWithCommission).toFixed(3)} KSM for ${
						validator[1].name
					}
  🥉${parseFloat(validator[2].poolRewardWithCommission).toFixed(3)} KSM for ${
						validator[2].name
					}
        
See how much you could be earning on https://polkanalytics.com/`,
					media_ids: list
				})
				.catch(err => {
					console.log("twit bot err", err);
				});
		})
		.catch(err => {
			console.log("err", err);
		});
}
