export class HttpCustomError extends Error {
    status: number;
    name: string;
    data: any;
    constructor({
        status,
        name,
        message,
        data,
    }: {
        status: number;
        name: string;
        message: string;
        data?: any;
    }) {
        super(message);
        this.name = name;
        this.status = status;
        this.data = data || null;
    }
}

export class QueueCustomError extends Error {
    name: string;
    data: any;
    constructor({
        name,
        message,
        data,
    }: {
        name: string;
        message: string;
        data?: any;
    }) {
        super(message);
        this.name = name;
        this.data = data || null;
    }
}
