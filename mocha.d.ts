// Types
export type Options = {
    outputJSON: boolean,
    outputFileName: string,
    generateHTML: boolean,
    reportDir: string,
    reportTitle: string,
    charts: boolean
}

export type TestMocha = {
    parentTitle: string,
    title: string,
    fullTitle: string,
    timedOut: boolean,
    duration: number,
    state: string,
    speed: string,
    pass: boolean,
    fail: boolean,
    pending: boolean,
    context: string,
    code: string,
    err: {
        message: string | undefined,
        estack: string | undefined,
    },
    uuid: string,
    isHook: boolean,
    skipped: boolean,
}

export type SuiteMocha = {
    uuid: string,
    title: string,
    fullFile: string | undefined,
    file: string,
    beforeHooks: object,
    afterHooks: object,
    tests: Array<TestMocha>,
    suites: Array<SuiteMocha>,
    passes: Array<string>,
    failures: Array<string>,
    pending: Array<string>,
    skipped: object,
    duration: number,
    root: boolean,
    rootEmpty: boolean,
    _timeout: number,
}

export type AttachmentsMocha = {
        title: string,
        value: string,
}

export type Result = {
    stats: {
        suites: number,
        tests: number,
        passes: number,
        pending: number,
        failures: number,
        start: Date,
        end: Date,
        duration: number,
        testsRegistered: number,
        passPercent: number,
        pendingPercent: number,
        other: number,
        hasOther: boolean,
        skipped: number,
        hasSkipped: boolean,
    },
    results: Array<SuiteMocha>,
    meta: {
        mochawesome: {
            options: object,
            version: string,
        },
        marge: {
            options: object,
            version: string,
        },
        mocha: {
            version: string,
        },
    }
}
