import stripAnsi from 'strip-ansi';
import { createSync } from 'mochawesome-report-generator';
import { v4 as uuid } from 'uuid';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import {
    Suite, TestCase, TestResult, TestStep,
} from '@playwright/test/reporter';

import {
    AttachmentsMocha, Options, SuiteMocha, TestMocha, StepsMocha,
} from './types';

// Import clean base model for results
import base from '../repo/base.json';

export default class MochawesomeRuntime {
    options: Options;

    steps: undefined | Array<StepsMocha>;

    totalDuration: number;

    constructor(options: Options) {
        this.options = options;
        this.steps = [undefined];
        this.totalDuration = 0;
    }

    initializeReport(suite: Suite) {
        // On initialization, dates and basic values can be filled in
        base.stats.start = new Date().toString();
        base.stats.tests = suite.allTests().length;
        base.stats.testsRegistered = suite.allTests().length;

        console.log(`------ Starting ${base.stats.tests} tests ------`);
    }

    populateSuites(suite: Suite) {
        // This foreach ensures to populate all running suites even if project has dependencies
        suite.suites.forEach((item) => {
            base.stats.suites += suite.suites.length;

            // This foreach iterates over all opened files by test runner
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

                // TODO: Improve below comment
                // deal with specs that don't use describe in it
                if (file.suites.length > 0) {
                    suiteObject.fullFile = file.location?.file;
                    suiteObject.file = file.title;
                    suiteObject.title = file.suites[0].title;

                    base.results[0].suites.push(suiteObject);
                } else if (file.tests.length > 0) {
                    suiteObject.fullFile = file.location?.file;
                    suiteObject.file = file.tests[0].parent.title;
                    suiteObject.title = file.tests[0].parent.title;

                    base.results[0].suites.push(suiteObject);
                }
            });
        });
    }

    populateSteps(test: TestCase, result: TestResult, step: TestStep) {
        this.steps.push({
            step: {
                title: step.title,
                category: step.category,
                duration: step.duration,
            },
            suite: test.parent.title,
            test: test.title,
        });
    }

    populateTests(test: TestCase, result: TestResult) {
        this.totalDuration += result.duration;

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

        // This foreach iterates over previously populated suites by populateSuites
        base.results[0].suites.forEach((suite) => {
            // Check if current test belongs to some of the previously added suite
            if (suite.title === test.parent.title) {
                suite.duration += result.duration;

                // Deal with test status and update corresponding values
                if (result.status === 'failed' && result.error?.message && result.error?.stack) {
                    testObject.fail = true;
                    testObject.err = {
                        message: stripAnsi(result.error.message),
                        estack: stripAnsi(result.error.stack),
                    };
                    base.stats.failures += 1;
                    suite.failures.push(generatedUuid);
                } else if (result.status === 'passed') {
                    testObject.pass = true;
                    base.stats.passes += 1;
                    suite.passes.push(generatedUuid);
                } else if (result.status === 'skipped') {
                    testObject.state = 'pending';
                    testObject.pending = true;
                    base.stats.pending += 1;
                    suite.pending.push(generatedUuid);
                }

                // Check if user has added attachment to test, it will be passed to report
                const att: Array<AttachmentsMocha> = [];
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

                // Add steps to test
                const intermediateStep = [];
                this.steps.forEach((element) => {
                    if (element?.suite === suite.title && element?.test === test.title) {
                        intermediateStep.push(`//Step: ${element.step.title} | Category: ${element.step.category} | Duration: ${element.step.duration}`);
                    }
                });
                testObject.code = intermediateStep.join('\n');

                // Send our test object to our results
                suite.tests.push(testObject);
            }
        });
    }

    writeConsoleStatus(test: TestCase, result: TestResult) {
        console.log(`\n* Test completed: ${test.parent.title} ${test.title}`);
        console.log(`* Status: ${result.status} | Duration: ${result.duration}ms`);
    }

    finalizeReport() {
        // On finalization, we need to fill in values thats depends on completed run
        base.stats.end = new Date().toString();
        base.stats.passPercent = (base.stats.passes * 100) / (base.stats.tests - base.stats.pending);
        base.stats.duration = this.totalDuration;
        base.stats.pendingPercent = (base.stats.pending * 100) / base.stats.tests;

        console.log('\n------ Execution completed ------');
        console.log(`------ Execution time ${base.stats.duration}ms ------`);
        console.log(`------ Success rate ${base.stats.passPercent}% ------\n`);
    }

    writeResult() {
        const basePath = join(cwd(), this.options.reportDir);

        if (!existsSync(basePath)) {
            mkdirSync(basePath, { recursive: true });
        }

        if (this.options.generateHTML) {
            createSync(base, {
                reportDir: this.options.reportDir,
                reportTitle: this.options.reportTitle,
                reportPageTitle: this.options.reportTitle,
                charts: this.options.charts,
            });

            console.log(`* HTML File saved to: ${join(cwd(), this.options.reportDir, 'mochawesome.html')}`);
        }

        if (this.options.outputJSON) {
            writeFileSync(join(cwd(), this.options.reportDir, this.options.outputFileName), JSON.stringify(base, undefined, 4));

            console.log(`* JSON File saved to: ${join(cwd(), this.options.reportDir, this.options.outputFileName)}`);
        }
    }
}
