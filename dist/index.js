// src
import MochawesomeRuntime from './runtime.js';
export default class MochawesomeReporter {
    options;
    runtime;
    constructor(options) {
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
    onBegin(_config, suite) {
        // Check if user has disabled both JSON and HTML report options
        if (!this.options.outputJSON && !this.options.generateHTML) {
            throw new Error('Output JSON and generate HTML cannot be both disabled!');
        }
        this.runtime.initializeReport(suite);
        this.runtime.populateSuites(suite);
    }
    onStepEnd(test, result, step) {
        this.runtime.populateSteps(test, result, step);
    }
    onTestEnd(test, result) {
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
