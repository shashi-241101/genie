import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
    orderId: string;
    userId: string;
    ticketId?: string; // Link to ticket if order is related to a support ticket
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
    }>;
    totalAmount: number;
    currency: string;
    status: "pending" | "processing" | "completed" | "cancelled" | "refunded";
    orderDate: Date;
    paymentMethod?: string;
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    metadata?: {
        platform?: string;
        region?: string;
    };
}

const OrderSchema = new Schema<IOrder>(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        ticketId: {
            type: String,
            index: true,
        },
        items: [
            {
                productId: String,
                productName: String,
                quantity: Number,
                price: Number,
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "EUR",
        },
        status: {
            type: String,
            enum: [
                "pending",
                "processing",
                "completed",
                "cancelled",
                "refunded",
            ],
            default: "pending",
            index: true,
        },
        orderDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        paymentMethod: String,
        shippingAddress: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String,
        },
        metadata: {
            platform: String,
            region: String,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient querying
OrderSchema.index({ userId: 1, orderDate: -1 });

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
