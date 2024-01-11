import stripAnsi from 'strip-ansi';
import { v4 as uuid } from 'uuid';
import { createSync } from 'mochawesome-report-generator';

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

// Types
import type {
    FullConfig, Reporter, Suite, TestCase, TestResult,
} from '@playwright/test/reporter';
import type {
    Options, TestMocha, SuiteMocha, AttachmentsMocha, Result,
} from './mocha';

// Default values
const compiledResult: Result = {
    stats: {
        suites: 0,
        tests: 0,
        passes: 0,
        pending: 0,
        failures: 0,
        start: new Date(),
        end: new Date(),
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

export default class PWMochawesomeReporter implements Reporter {
    options: Options;

    constructor(options: Options) {
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

    onBegin(_config: FullConfig, suite: Suite) {
        if (!this.options.outputJSON && !this.options.generateHTML) {
            throw new Error('Output JSON and generate HTML cannot be both disabled!');
        }

        compiledResult.stats.tests = suite.allTests().length;
        compiledResult.stats.testsRegistered = suite.allTests().length;
        compiledResult.stats.start = new Date();

        // deal with project that has dependencies to run
        suite.suites.forEach((item) => {
            compiledResult.stats.suites += suite.suites.length;

            item.suites.forEach((file) => {
                const generatedUuid = uuid();
                const suiteObject: SuiteMocha = {
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
                    suiteObject.fullFile = file.location?.file;
                    suiteObject.file = file.title;
                    suiteObject.title = file.suites[0].title;

                    compiledResult.results[0].suites.push(suiteObject);
                } else if (file.tests.length > 0) {
                    suiteObject.fullFile = file.location?.file;
                    suiteObject.file = file.tests[0].parent.title;
                    suiteObject.title = file.tests[0].parent.title;

                    compiledResult.results[0].suites.push(suiteObject);
                }
            });
        });
    }

    onTestEnd(test: TestCase, result: TestResult) {
        const generatedUuid = uuid();
        const testObject: TestMocha = {
            parentTitle: test.parent.title,
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
            err: {
                message: undefined,
                estack: undefined,
            },
            uuid: generatedUuid,
            isHook: false,
            skipped: false,
        };

        totalDuration += result.duration;

        // search for each suite that we have added previously
        compiledResult.results[0].suites.forEach((suite) => {
            // check if current test belongs to some of the previosly added suite
            if (suite.title === test.parent.title) {
                suite.duration += result.duration;

                // deal with test status and update corresponding values
                if (result.status === 'failed' && result.error?.message && result.error?.stack) {
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
                const att: Array<AttachmentsMocha> = [];

                // if user has added attachment to test, it will be passed to report
                result.attachments.forEach((context) => {
                    if (context.contentType === 'application/json' && context.body !== undefined) {
                        att.push({
                            title: context.name,
                            value: JSON.parse(context.body.toString()),
                        });
                    } else if (context.contentType === 'image/png' && context.body !== undefined) {
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
                    } else if (context.contentType === 'application/zip' && context.path !== undefined) {
                        att.push({
                            title: 'Trace saved to',
                            value: context.path,
                        });
                    } else if (context.contentType === 'text/plain' && context.body !== undefined) {
                        att.push({
                            title: context.name,
                            value: context.body.toString(),
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
            writeFileSync(join(cwd(), this.options.reportDir, this.options.outputFileName), JSON.stringify(compiledResult, undefined, 4));

            console.log(`\nJSON File saved to: ${join(cwd(), this.options.reportDir, this.options.outputFileName)}`);
        }
    }
}
