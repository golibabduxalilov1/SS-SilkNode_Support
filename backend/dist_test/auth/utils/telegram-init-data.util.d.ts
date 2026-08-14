export interface TelegramInitDataUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
}
export interface ParsedInitData {
    user: TelegramInitDataUser;
    authDate: number;
}
export declare function validateTelegramInitData(initData: string, botToken: string): ParsedInitData | null;
