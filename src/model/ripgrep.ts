import * as vscode from "vscode";

export interface RgQuery {
    title: string;
    opt: string;
    srchPath: string | undefined;
    replaceQuery: boolean;
    skipQuote: boolean;
}

export interface RipgrepResult {
    type: string;
    data: RipgrepMatchData;
}

export interface RipgrepMatchData {
    path: {
        text: string;
    };

    lines?: {
        text: string;
    };

    line_number?: number;
    absolute_offset?: number;

    submatches?: {
        match: {
            text: string;
            start: number;
            end: number;
        };
    }[];

}

export interface QuickPickItemResults {
    total: number;
    items: QuickPickItemRgData[];
}

export interface QuickPickItemRgData extends vscode.QuickPickItem {
    line_number: number;
    start: number;
    end: number;
    option: string;
    replaceQuery: boolean;
    skipQuote: boolean;
}

export interface RgSummaryData {
    data: {
        elapsed_total: {
            human: string;
            nanos: number;
            secs: number;
        };
        stats: {
            bytes_printed: number;
            bytes_searched: number;
            elapsed: {
                human: string;
                nanos: number;
                secs: number;
            };
            matched_lines: number;
            matches: number;
            searches: number;
            searches_with_match: number;
        };
    };
    type: string;
}
