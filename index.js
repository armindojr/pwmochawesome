const stripAnsi = require('strip-ansi');
const { v4: uuid } = require('uuid');
const { createSync } = require('mochawesome-report-generator');
const {
    writeFileSync, existsSync, mkdirSync,
} = require('fs');
const { join } = require('path');
const { cwd } = require('process');

const compiledResult = {
    stats: {
        suites: 0,
        tests: 0,
        passes: 0,
        pending: 0,
        failures: 0,
        start: '',
        end: '',
        duration: 0,
        testsRegistered: 0,
        passPercent: 0,
        pendingPercent: 0,
        other: 0,
        hasOther: false,
        skipped: 0,
        hasSkipped: false,
    },
    results: [
        {
            uuid: uuid(),
            title: '',
            fullFile: '',
            file: '',
            beforeHooks: [],
            afterHooks: [],
            tests: [],
            suites: [],
            passes: [],
            failures: [],
            pending: [],
            skipped: [],
            duration: 0,
            root: true,
            rootEmpty: true,
            _timeout: 0,
        },
    ],
    meta: {
        mochawesome: {
            options: {},
            version: '7.0.1',
        },
        marge: {
            options: {},
            version: '6.2.0',
        },
        mocha: {
            version: '7.0.1',
        },
    },
};
let totalDuration = 0;

class PWMochawesomeReporter {
    constructor(options) {
        this.options = {
            outputJSON: false,
            outputFileName: 'mochawesome.json',
            generateHTML: true,
            reportDir: 'mochawesome-report',
            reportTitle: 'Playwright Mochawesome',
            charts: false,
        };

        if (options) {
            this.options = {
                ...this.options,
                ...options,
            };
        }
    }

    onBegin(config, suite) {
        if (!this.options.outputJSON && !this.options.generateHTML) {
            throw new Error('Output JSON and generate HTML cannot be both disabled!');
        }

        compiledResult.stats.tests = suite.allTests().length;
        compiledResult.stats.testsRegistered = suite.allTests().length;
        compiledResult.stats.start = new Date();
        compiledResult.stats.suites = suite.suites[0].suites.length;

        // files opened by test runner
        suite.suites[0].suites.forEach((file) => {
            const generatedUuid = uuid();
            const suiteObject = {
                uuid: generatedUuid,
                title: '',
                fullFile: '',
                file: '',
                beforeHooks: [],
                afterHooks: [],
                tests: [],
                suites: [],
                passes: [],
                failures: [],
                pending: [],
                skipped: [],
                duration: 0,
                root: false,
                rootEmpty: false,
                _timeout: 0,
            };

            // deal with specs that don't use describe in it
            if (file.suites.length > 0) {
                suiteObject.fullFile = file.location.file;
                suiteObject.file = file.title;

                suiteObject.title = file.suites[0].title;
                file.suites[0].uuid = generatedUuid;

                compiledResult.results[0].suites.push(suiteObject);
            } else if (file.tests.length > 0) {
                suiteObject.fullFile = file.location.file;
                suiteObject.file = file.tests[0].parent.title;

                suiteObject.title = file.tests[0].parent.title;
                file.tests[0].parent.uuid = generatedUuid;

                compiledResult.results[0].suites.push(suiteObject);
            }
        });
    }

    onTestEnd(test, result) {
        const generatedUuid = uuid();
        const testObject = {
            title: test.title,
            fullTitle: `${test.parent.title} ${test.title}`,
            timedOut: false,
            duration: result.duration,
            state: result.status,
            speed: 'slow',
            pass: false,
            fail: false,
            pending: false,
            context: '',
            code: '',
            err: {},
            uuid: generatedUuid,
            parentUUID: test.parent.uuid,
            isHook: false,
            skipped: false,
        };

        totalDuration += result.duration;

        // search for each suite that we have added previously
        compiledResult.results[0].suites.forEach((suite) => {
            // check if current test id is equal to some of the previosly added suite
            if (suite.uuid === test.parent.uuid) {
                suite.duration += result.duration;

                // append test code to reporter
                testObject.code = String(test.fn);

                // deal with test status and update corresponding values
                if (result.status === 'failed') {
                    testObject.fail = true;
                    testObject.err = {
                        message: stripAnsi(result.error.message),
                        estack: stripAnsi(result.error.stack),
                    };
                    compiledResult.stats.failures += 1;
                    suite.failures.push(generatedUuid);
                } else if (result.status === 'passed') {
                    testObject.pass = true;
                    compiledResult.stats.passes += 1;
                    suite.passes.push(generatedUuid);
                } else if (result.status === 'skipped') {
                    testObject.state = 'pending';
                    testObject.pending = true;
                    compiledResult.stats.pending += 1;
                    suite.pending.push(generatedUuid);
                }

                // list of attachments
                const att = [];

                // if user has added attachment to test, it will be passed to report
                result.attachments.forEach((context) => {
                    if (context.contentType === 'application/json') {
                        att.push({
                            title: context.name,
                            value: JSON.stringify(JSON.parse(context.body)),
                        });
                    } else if (context.contentType === 'image/png') {
                        if (context.path) {
                            att.push({
                                title: context.name,
                                value: context.path,
                            });
                        } else {
                            att.push({
                                title: context.name,
                                value: `data:image/png;base64, ${context.body.toString('base64')}`,
                            });
                        }
                    } else if (context.contentType === 'application/zip') {
                        att.push({
                            title: 'Trace saved to',
                            value: context.path,
                        });
                    }

                    testObject.context = JSON.stringify(att);
                });

                // send test object to our results
                suite.tests.push(testObject);
            }
        });
    }

    onEnd() {
        compiledResult.stats.end = new Date();
        compiledResult.stats.passPercent = (compiledResult.stats.passes * 100) / (compiledResult.stats.tests - compiledResult.stats.pending);
        compiledResult.stats.duration = totalDuration;
        compiledResult.stats.pendingPercent = (compiledResult.stats.pending * 100) / compiledResult.stats.tests;

        const basePath = join(cwd(), this.options.reportDir);

        if (!existsSync(basePath)) {
            mkdirSync(basePath, { recursive: true });
        }

        if (this.options.generateHTML) {
            createSync(compiledResult, {
                reportDir: this.options.reportDir,
                reportTitle: this.options.reportTitle,
                reportPageTitle: this.options.reportTitle,
                charts: this.options.charts,
            });

            console.log(`\nHTML File saved to: ${join(cwd(), this.options.reportDir, 'mochawesome.html')}`);
        }

        if (this.options.outputJSON) {
            writeFileSync(join(cwd(), this.options.reportDir, this.options.outputFileName), JSON.stringify(compiledResult));

            console.log(`\nJSON File saved to: ${join(cwd(), this.options.reportDir, this.options.outputFileName)}`);
        }
    }

    printsToStdio() { }
}

module.exports = PWMochawesomeReporter;
