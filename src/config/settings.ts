import Ajv, * as ajv from 'ajv';
import AjvFormats from "ajv-formats";
import _ from 'lodash';
import * as vscode from "vscode";
import logger from '../utils/logger';

export interface EverythingConfigProperty {
    [key: string]: any;
    enabled: boolean;
    query: string;
    fullpath: boolean;
    regex: boolean;
    sort: string;
    ascending?: boolean;
    description: string;
    inWorkspace: boolean;
}

export interface EverythingConfig extends EverythingConfigProperty {
    name: string;
    filterType: string;
    title: string;
}

export type FindSuitePropertyType = "everythingConfig";

export default class FindSuiteSettings {

    private static readonly extensionName = "utocode.findsuite";

    private static readonly compiledSchemas = new Map<string, ajv.ValidateFunction>();

    private static readonly rootName = 'findsuite';

    private static isMac: boolean = process.platform === "darwin";
    private static isLinux: boolean = process.platform === "linux";
    private static isWindows: boolean = process.platform === "win32";

    private static getPlatform(): string {
        if (FindSuiteSettings.isMac) {
            return 'mac';
        } else if (FindSuiteSettings.isLinux) {
            return 'linux';
        } else {
            return 'windows';
        }
    }

    private static getPlatformProperty(property: string): string {
        if (FindSuiteSettings.isWindows) {
            return `${property}.windows`;
        } else if (FindSuiteSettings.isMac) {
            return `${property}.mac`;
        } else if (FindSuiteSettings.isLinux) {
            return `${property}.linux`;
        }
        return property;
    }

    private static config<T>(name: string): T | undefined {
        let settings = vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<T>(name);
        if (settings === undefined) {
            return undefined;
        }

        return _.merge({}, settings.globalValue, settings.workspaceValue, settings.workspaceFolderValue);
    }

    private static validate(obj: any, property: FindSuitePropertyType) {
        try {
            if (!FindSuiteSettings.compiledSchemas.has(property)) {
                let ext = vscode.extensions.getExtension(FindSuiteSettings.extensionName);
                if (!ext) {
                    logger.error(`Could not find configuration [${FindSuiteSettings.extensionName}]`);
                    return;
                }

                let schema = ext.packageJSON.contributes.configuration?.properties?.[`clipsuite.${property}`];
                if (!schema) {
                    logger.error(`Could not find configuration schema [clipsuite.${property}]`);
                    return;
                }

                const ajv = new Ajv({ allErrors: true });
                AjvFormats(ajv);
                FindSuiteSettings.compiledSchemas.set(property, ajv.compile(schema));
            }

            let validator = FindSuiteSettings.compiledSchemas.get(property) as ajv.ValidateFunction;
            let validationResult = validator(obj);
            if (!validationResult) {
                let errorMsg = "There is an Error in Configuration: Please see Output window\n";
                errorMsg += (validator.errors as ajv.ErrorObject[]).map((err: any) => {
                    return `In clipsuite.${property}.${err.dataPath}: ${err.message}`;
                }).join("\n");

                logger.error(errorMsg);
                throw new Error("There is an Error in Configuration: Please see Output window");
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
        }
    }

    public static getProperty(key: string): string | undefined {
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key);
    }

    public static get host(): string {
        const key = 'everything.host';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            '127.0.0.1';
    }

    public static get port(): number {
        const key = 'everything.port';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<number>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<number>(key)?.defaultValue
            ??
            3380;
    }

    public static get count(): number {
        const key = 'everything.count';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<number>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<number>(key)?.defaultValue
            ??
            500;
    }

    public static get limitOpenFile(): number {
        const key = 'everything.limitOpenFile';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<number>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<number>(key)?.defaultValue
            ??
            100;
    }

    public static get rgCount(): number {
        const key = 'rg.count';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<number>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<number>(key)?.defaultValue
            ??
            300;
    }

    public static get internalEnabled(): boolean {
        const key = 'rg.internal.enabled';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<boolean>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<boolean>(key)?.defaultValue
            ??
            true;
    }

    public static get rgWin32Program(): string {
        const key = 'rg.program.win32';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            'rg.exe';
    }

    public static get rgMacProgram(): string {
        const key = 'rg.program.mac';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            'rg';
    }

    public static get rgLinuxProgram(): string {
        const key = 'rg.program.linux';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            'rg';
    }

    public static get defaultOption(): string {
        const key = 'rg.defaultOption';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            '';
    }

    public static get custom1(): string {
        const key = 'rg.custom1';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            '';
    }

    public static get custom2(): string {
        const key = 'rg.custom2';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            '';
    }

    public static get custom3(): string {
        const key = 'rg.custom3';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            '';
    }

    public static get custom4(): string {
        const key = 'rg.custom4';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            '';
    }

    public static get custom5(): string {
        const key = 'rg.custom5';
        return vscode.workspace.getConfiguration(FindSuiteSettings.rootName).get<string>(key)
            ??
            vscode.workspace.getConfiguration(FindSuiteSettings.rootName).inspect<string>(key)?.defaultValue
            ??
            '';
    }

    public static get everythingConfig(): Map<string, EverythingConfig> {
        const key = 'everythingConfig';
        let evConfig = this.config<{ [name: string]: EverythingConfigProperty }>(key);
        if (evConfig === undefined) {
            return new Map();
        }

        this.validate(evConfig, key);

        const map = new Map<string, EverythingConfig>;
        for (const [name, everythingSearchProperty] of Object.entries(evConfig)) {
            const env = FindSuiteSettings.getPlatform();
            let everythingSearch = everythingSearchProperty;
            if (env in everythingSearch) {
                everythingSearch = _.merge(everythingSearchProperty, everythingSearchProperty[env] as Partial<EverythingConfig>);
            }
            everythingSearch.name = name;
            map.set(name, everythingSearch as EverythingConfig);
        }
        return map;
    }

}
