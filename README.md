Playwright Mochawesome Reporter
=========================

Using playwright test runner to get info about executed tests, it can generate JSON and HTML with [Mochawesome](https://github.com/adamgruber/mochawesome) pattern and style. Main goal of this project is to provide an alternative for default reporter for [Playwright](https://playwright.dev/).

## Installation
```bash
npm install pwmochawesome --save-dev
```

## Usage
According to how Playwright is coded, to use a custom reporter as a package you need to create a file inside your project to import this package like this:

`{project folder}/report.js`
```js
const pwmochawesome = require('pwmochawesome');

module.exports = pwmochawesome;
```

Then you can configure it inside your playwright config file:

`{project folder}/playwright.config.js`
```js
const config = {
  reporter: [ [ './report.js' ] ],
};

module.exports = config;
```

Note that we reference our previously created file `report.js` inside reporter property of configuration. With this we can use our custom reporter.

## Options
|option|default|description|
|---|---|---|
|outputJSON|false|Defines whether or not to generate a .json file containing the test results|
|outputFileName|'mochawesome.json'|Defines the name of the .json file if it is enabled|
|generateHTML|true|Defines whether to generate a report in HTML|
|reportDir|'mochawesome-report'|Determines the name of the folder that will contain the test results|
|reportTitle|'Playwright Mochawesome'|Title that the html report will use|
|charts|false|Whether to show charts in html report|

How to pass options to reporter:
`{project folder}/playwright.config.js`
```js
const config = {
  reporter: [ [ 
      './report.js', {
        outputJSON: true,
        outputFileName: 'result.json'
      } 
  ] ],
};

module.exports = config;
```


## Information
This project is tested and confirmed to work with `@playwright/test: 1.20.2`. If you have more recent version and this package don't work, please create a bug or contribute with pull request.


Version compatibility:

| Playwright Mochawesome Reporter | Mochawesome | Marge |
| ------------------------------- | ----------- | ----- |
| 1.0.0                           | 7.0.1       | 6.2.0 |