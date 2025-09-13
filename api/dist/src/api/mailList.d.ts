import { Response } from 'express';
interface ExtendedRequest {
    query: {
        recipient?: string;
        [key: string]: any;
    };
    realIP: string;
    ip?: string;
}
declare const _default: (req: ExtendedRequest, res: Response) => void;
export default _default;
//# sourceMappingURL=mailList.d.ts.map