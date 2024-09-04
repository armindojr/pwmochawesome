// Types
import type {
  FullConfig,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep
} from '@playwright/test/reporter';
import type { Options } from './types.d.ts';

// src
import MochawesomeRuntime from './runtime.js';

export default class MochawesomeReporter implements Reporter {
  options: Options;

  runtime: MochawesomeRuntime;

  constructor(options: Options) {
    this.options = {
      outputJSON: false,
      outputFileName: 'mochawesome.json',
      generateHTML: true,
      reportDir: 'mochawesome-report',
      reportTitle: 'Playwright Mochawesome',
      charts: false
    };

    // Merge default options with the ones user has passed
    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.runtime = new MochawesomeRuntime(this.options);
  }

  onBegin(_config: FullConfig, suite: Suite) {
    // Check if user has disabled both JSON and HTML report options
    if (!this.options.outputJSON && !this.options.generateHTML) {
      throw new Error('Output JSON and generate HTML cannot be both disabled!');
    }

    this.runtime.initializeReport(suite);
    this.runtime.populateSuites(suite);
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep) {
    this.runtime.populateSteps(test, result, step);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.runtime.writeConsoleStatus(test, result);
    this.runtime.populateTests(test, result);
  }

  onEnd() {
    this.runtime.finalizeReport();
    this.runtime.writeResult();
  }

  printsToStdio() {
    return true;
  }
}
