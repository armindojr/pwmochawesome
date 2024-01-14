const fs = require('fs');
const reportGen = require('mochawesome-report-generator');
const MochawesomeRuntime = require('../dist/runtime').default;

// mock
const options = {
    outputJSON: true,
    outputFileName: 'mochawesome.json',
    generateHTML: true,
    reportDir: 'mochawesome-report',
    reportTitle: 'Playwright Mochawesome',
    charts: false,
};

const mockSuite = require('./mock/mockSuite.json');
const mockResult = require('./mock/mockResult.json');
const mocktest = require('./mock/mockTest.json');
const mockStep = require('./mock/mockStep.json');

describe('MochawesomeRuntime', () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
    const runtime = new MochawesomeRuntime(options);

    beforeEach(() => {
        runtime.clear();
    });

    afterAll(() => {
        consoleLogMock.mockRestore();
    });

    test('Instancing class with options', () => {
        expect(runtime).toBeDefined();
    });

    test('Instancing class without options', () => {
        expect(() => {
            new MochawesomeRuntime();
        }).toThrow();
    });

    test('Access to all methods', () => {
        expect(typeof runtime.initializeReport).toBe('function');
        expect(typeof runtime.populateSuites).toBe('function');
        expect(typeof runtime.populateSteps).toBe('function');
        expect(typeof runtime.populateTests).toBe('function');
        expect(typeof runtime.writeConsoleStatus).toBe('function');
        expect(typeof runtime.finalizeReport).toBe('function');
        expect(typeof runtime.writeResult).toBe('function');
    });

    describe('initializeReport', () => {
        test('Call function with parameters', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2024, 1, 1));
            const allTests = jest.fn(() => [1, 2]);

            const result = runtime.initializeReport({
                allTests,
            });

            expect(allTests).toHaveBeenCalledTimes(2);
            expect(consoleLogMock).toHaveBeenCalledTimes(1);
            expect(result.stats.tests).toEqual(2);
            expect(result.stats.start).toContain('Thu Feb 01 2024');
            jest.useRealTimers();
        });

        test('Call function without parameters', () => {
            expect(() => {
                runtime.initializeReport();
            }).toThrow();
        });
    });

    describe('populateSuites', () => {
        test('Call function with parameters with suite using describe', () => {
            const result = runtime.populateSuites(mockSuite.suite1);

            expect(result.results[0].suites[0].fullFile).toEqual('file.js');
            expect(result.results[0].suites[0].file).toEqual('Suite title 1');
            expect(result.results[0].suites[0].title).toEqual('Suite title 2');
        });

        test('Call function with parameters without suite using describe', () => {
            const mock = {
                ...mockSuite.suite2,
            };
            mock.suites[0].suites[0].tests.push(mocktest.testRoot);
            const result = runtime.populateSuites(mockSuite.suite2);

            expect(result.results[0].suites[0].fullFile).toEqual('file.js');
            expect(result.results[0].suites[0].file).toEqual('Suite title 1');
            expect(result.results[0].suites[0].title).toEqual('Suite title 1');
        });

        test('Call function without parameters', () => {
            expect(() => {
                runtime.populateSuites();
            }).toThrow();
        });
    });

    describe('populateSteps', () => {
        test('Call function with parameters', () => {
            const result = runtime.populateSteps(mocktest.testDescribe, mockResult.success, mockStep.basicStep);

            expect(result[0].step.title).toEqual('Step 1');
            expect(result[0].step.category).toEqual('pw:api');
            expect(result[0].step.duration).toEqual(1);
            expect(result[0].suite).toEqual('Suite title 2');
            expect(result[0].test).toEqual('Test title 1');
        });

        test('Call function without parameters', () => {
            expect(() => {
                runtime.populateSteps();
            }).toThrow();

            expect(() => {
                runtime.populateSteps(1, undefined, undefined);
            }).toThrow();

            expect(() => {
                runtime.populateSteps(1, 1, undefined);
            }).toThrow();
        });
    });

    describe('populateTests', () => {
        test('Test within describe suite', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.success);

            expect(result.results[0].suites[0].tests[0].title).toEqual('Test title 1');
            expect(result.results[0].suites[0].tests[0].fullTitle).toEqual('Suite title 2 Test title 1');
            expect(result.results[0].suites[0].tests[0].pass).toEqual(true);
        });

        test('Test within root suite', () => {
            runtime.populateSuites(mockSuite.suite2);
            const result = runtime.populateTests(mocktest.testRoot, mockResult.success);

            expect(result.results[0].suites[0].tests[0].title).toEqual('Test title 1');
            expect(result.results[0].suites[0].tests[0].fullTitle).toEqual('Suite title 1 Test title 1');
            expect(result.results[0].suites[0].tests[0].pass).toEqual(true);
        });

        test('Test with fail status', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.fail);

            expect(result.results[0].suites[0].tests[0].fail).toEqual(true);
            expect(result.results[0].suites[0].tests[0].err.message).toEqual('error message');
            expect(result.results[0].suites[0].tests[0].err.estack).toEqual('stack trace');
        });

        test('Test with skip status', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.skip);

            expect(result.results[0].suites[0].tests[0].pending).toEqual(true);
            expect(result.results[0].suites[0].tests[0].duration).toEqual(0);
        });

        test('Test attaching json', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.attachJson);

            expect(result.results[0].suites[0].tests[0].context).toContain('json');
            expect(result.results[0].suites[0].tests[0].context).toContain('123');
        });

        test('Test attaching png with path', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.attachPngPath);

            expect(result.results[0].suites[0].tests[0].context).toContain('image');
            expect(result.results[0].suites[0].tests[0].context).toContain('test/image.png');
        });

        test('Test attaching png base64', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.attachPngBase64);

            expect(result.results[0].suites[0].tests[0].context).toContain('image');
            expect(result.results[0].suites[0].tests[0].context).toContain('4AAQSkZJRgABAQAAAQABAAD');
        });

        test('Test attaching trace', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.attachTrace);

            expect(result.results[0].suites[0].tests[0].context).toContain('trace');
            expect(result.results[0].suites[0].tests[0].context).toContain('test/trace.zip');
        });

        test('Test attaching text', () => {
            runtime.populateSuites(mockSuite.suite1);
            const result = runtime.populateTests(mocktest.testDescribe, mockResult.attachText);

            expect(result.results[0].suites[0].tests[0].context).toContain('text');
            expect(result.results[0].suites[0].tests[0].context).toContain('test');
        });

        test('Call function without parameters', () => {
            expect(() => {
                runtime.populateTests();
            }).toThrow();

            expect(() => {
                runtime.populateTests(1, undefined);
            }).toThrow();
        });
    });

    describe('writeConsoleStatus', () => {
        test('Call function', () => {
            runtime.writeConsoleStatus(mocktest.testRoot, mockResult.success);

            expect(consoleLogMock).toHaveBeenCalledTimes(2);
        });

        test('Call function without parameters', () => {
            expect(() => {
                runtime.writeConsoleStatus();
            }).toThrow();

            expect(() => {
                runtime.writeConsoleStatus(1, undefined);
            }).toThrow();
        });
    });

    describe('finalizeReport', () => {
        test('Call function', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2024, 2, 1));

            const result = runtime.finalizeReport();

            expect(consoleLogMock).toHaveBeenCalledTimes(3);
            expect(result.stats.end).toContain('Fri Mar 01 2024');
            expect(result.stats.passPercent).toEqual(0);
            expect(result.stats.duration).toEqual(0);
            expect(result.stats.pendingPercent).toEqual(0);
            jest.useRealTimers();
        });
    });

    describe('writeResult', () => {
        const existsMock = jest.spyOn(fs, 'existsSync').mockImplementation(() => false);
        const mkdirMock = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => true);
        const generateMock = jest.spyOn(reportGen, 'createSync').mockImplementation();
        const writeFileMock = jest.spyOn(fs, 'writeFileSync').mockImplementation();

        afterAll(() => {
            existsMock.mockRestore();
            mkdirMock.mockRestore();
            generateMock.mockRestore();
            writeFileMock.mockRestore();
        });

        test('Call function', () => {
            runtime.writeResult();

            expect(existsMock).toHaveBeenCalledTimes(1);
            expect(mkdirMock).toHaveBeenCalledTimes(1);
            expect(generateMock).toHaveBeenCalledTimes(1);
            expect(writeFileMock).toHaveBeenCalledTimes(1);
        });
    });
});
