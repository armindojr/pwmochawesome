import type {
    FullConfig, Reporter, Suite, TestCase, TestResult,
} from '@playwright/test/reporter';
import type { Options } from './types';

declare class MochawesomeReporter implements Reporter {
    constructor(options: Options);

    onBegin(config: FullConfig, suite: Suite): void;

    // onStepBegin(test: TestCase, _result: TestResult, step: TestStep);
    // onStepEnd(_test: TestCase, _result: TestResult, step: TestStep);
    onTestEnd(test: TestCase, result: TestResult): void;

    onEnd(): void;

    printsToStdio(): boolean;
}

export default MochawesomeReporter;
