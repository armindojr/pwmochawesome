import stripAnsi from 'strip-ansi';
import { createSync } from 'mochawesome-report-generator';
import { v4 as uuid } from 'uuid';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import { Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

import { AttachmentsMocha, Options, SuiteMocha, TestMocha, StepsMocha } from './types.js';

// Import clean base model for results
import base from './base.json' with { type: 'json' };

export default class MochawesomeRuntime {
  options: Options;

  steps: undefined | Array<StepsMocha>;

  base: typeof base;

  totalDuration: number;

  constructor(options: Options) {
    if (!options) {
      throw new Error("Options can't be undefined!");
    }

    this.base = JSON.parse(JSON.stringify(base));
    this.options = options;
    this.steps = [];
    this.totalDuration = 0;
  }

  initializeReport(suite: Suite) {
    if (!suite) {
      throw new Error("Suite can't be undefined!");
    }

    // On initialization, dates and basic values can be filled in
    this.base.stats.start = new Date().toString();
    this.base.stats.tests = suite.allTests().length;
    this.base.stats.testsRegistered = suite.allTests().length;

    console.log(`------ Starting ${this.base.stats.tests} tests ------`);

    return this.base;
  }

  populateSuites(suite: Suite) {
    if (!suite) {
      throw new Error("Suite can't be undefined!");
    }

    // This foreach ensures to populate all running suites even if project has dependencies
    suite.suites.forEach(item => {
      this.base.stats.suites += suite.suites.length;

      // This foreach iterates over all opened files by test runner
      item.suites.forEach(file => {
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
          _timeout: 0
        };

        // TODO: Improve below comment
        // deal with specs that don't use describe in it
        if (file.suites.length > 0) {
          suiteObject.fullFile = file.location?.file;
          suiteObject.file = file.title;
          suiteObject.title = file.suites[0].title;

          this.base.results[0].suites.push(suiteObject);
        } else if (file.tests.length > 0) {
          suiteObject.fullFile = file.location?.file;
          suiteObject.file = file.tests[0].parent.title;
          suiteObject.title = file.tests[0].parent.title;

          this.base.results[0].suites.push(suiteObject);
        }
      });
    });

    return this.base;
  }

  populateSteps(test: TestCase, result: TestResult, step: TestStep) {
    if (!test || !result || !step) {
      throw new Error("Parameters can't be undefined!");
    }

    this.steps.push({
      step: {
        title: step.title,
        category: step.category,
        duration: step.duration
      },
      suite: test.parent.title,
      test: test.title
    });

    return this.steps;
  }

  populateTests(test: TestCase, result: TestResult) {
    if (!test || !result) {
      throw new Error("Parameters can't be undefined!");
    }

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
        estack: undefined
      },
      uuid: generatedUuid,
      isHook: false,
      skipped: false
    };

    // This foreach iterates over previously populated suites by populateSuites
    this.base.results[0].suites.forEach(suite => {
      // Check if current test belongs to some of the previously added suite
      if (suite.title === test.parent.title) {
        suite.duration += result.duration;

        // Deal with test status and update corresponding values
        if (result.status === 'failed' && result.error?.message && result.error?.stack) {
          testObject.fail = true;
          testObject.err = {
            message: stripAnsi(result.error.message),
            estack: stripAnsi(result.error.stack)
          };
          this.base.stats.failures += 1;
          suite.failures.push(generatedUuid);
        } else if (result.status === 'passed') {
          testObject.pass = true;
          this.base.stats.passes += 1;
          suite.passes.push(generatedUuid);
        } else if (result.status === 'skipped') {
          testObject.state = 'pending';
          testObject.pending = true;
          this.base.stats.pending += 1;
          suite.pending.push(generatedUuid);
        }

        // Check if user has added attachment to test, it will be passed to report
        const att: Array<AttachmentsMocha> = [];
        result.attachments.forEach(context => {
          if (context.contentType === 'application/json' && context.body !== undefined) {
            att.push({
              title: context.name,
              value: JSON.parse(context.body.toString())
            });
          } else if (context.contentType === 'image/png') {
            if (context.path) {
              att.push({
                title: context.name,
                value: context.path
              });
            } else if (context.body !== undefined) {
              att.push({
                title: context.name,
                value: `data:image/png;base64, ${context.body.toString('base64')}`
              });
            }
          } else if (context.contentType === 'application/zip' && context.path !== undefined) {
            att.push({
              title: 'Trace saved to',
              value: context.path
            });
          } else if (context.contentType === 'text/plain' && context.body !== undefined) {
            att.push({
              title: context.name,
              value: context.body.toString()
            });
          }

          testObject.context = JSON.stringify(att);
        });

        // Add steps to test
        const intermediateStep = [];
        this.steps.forEach(element => {
          if (element?.suite === suite.title && element?.test === test.title) {
            intermediateStep.push(
              `//Step: ${element.step.title} | Category: ${element.step.category} | Duration: ${element.step.duration}`
            );
          }
        });
        testObject.code = intermediateStep.join('\n');

        // Send our test object to our results
        suite.tests.push(testObject);
      }
    });

    return this.base;
  }

  writeConsoleStatus(test: TestCase, result: TestResult) {
    if (!test || !result) {
      throw new Error("Parameters can't be undefined!");
    }

    console.log(`\n* Test completed: ${test.parent.title} ${test.title}`);
    console.log(`* Status: ${result.status} | Duration: ${result.duration}ms`);
  }

  finalizeReport() {
    // On finalization, we need to fill in values thats depends on completed run
    this.base.stats.end = new Date().toString();
    this.base.stats.passPercent =
      (this.base.stats.passes * 100) / (this.base.stats.tests - this.base.stats.pending);
    this.base.stats.duration = this.totalDuration;
    this.base.stats.pendingPercent = (this.base.stats.pending * 100) / this.base.stats.tests;

    if (isNaN(this.base.stats.passPercent)) {
      this.base.stats.passPercent = 0;
    }

    if (isNaN(this.base.stats.pendingPercent)) {
      this.base.stats.pendingPercent = 0;
    }

    console.log('\n------ Execution completed ------');
    console.log(`------ Execution time ${this.base.stats.duration}ms ------`);
    console.log(`------ Success rate ${this.base.stats.passPercent}% ------\n`);

    return this.base;
  }

  writeResult() {
    const basePath = join(cwd(), this.options.reportDir);

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }

    if (this.options.generateHTML) {
      createSync(this.base, {
        reportDir: this.options.reportDir,
        reportTitle: this.options.reportTitle,
        reportPageTitle: this.options.reportTitle,
        charts: this.options.charts
      });

      console.log(
        `* HTML File saved to: ${join(cwd(), this.options.reportDir, 'mochawesome.html')}`
      );
    }

    if (this.options.outputJSON) {
      writeFileSync(
        join(cwd(), this.options.reportDir, this.options.outputFileName),
        JSON.stringify(this.base, undefined, 4)
      );

      console.log(
        `* JSON File saved to: ${join(cwd(), this.options.reportDir, this.options.outputFileName)}`
      );
    }
  }

  clear() {
    this.base = JSON.parse(JSON.stringify(base));
    this.totalDuration = 0;
  }
}
