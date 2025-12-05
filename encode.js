const fs = require("fs");
const key = fs.readFileSync("./smart-deals-86bb6-firebase-adminsdk-fbsvc-0b2ef10fc4.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
console.log(base64);