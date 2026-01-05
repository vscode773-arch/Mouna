import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    try {
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);

        // 1. Find Expiring Products
        const expiringProducts = await prisma.product.findMany({
            where: {
                expiry: {
                    gte: today,
                    lte: sevenDaysFromNow
                }
            },
            select: { name: true, expiry: true }
        });

        if (expiringProducts.length === 0) {
            return res.status(200).json({ message: 'No expiring products found.' });
        }

        // 2. Prepare Notification
        const count = expiringProducts.length;
        const message = `⚠️ تنبيه: لديكم ${count} منتجات ستنتهي صلاحيتها قريباً! تفقد المخزون الآن.`;

        // 3. Send to OneSignal
        // NOTE: This requires ONESIGNAL_REST_API_KEY environment variable in Vercel
        if (!process.env.ONESIGNAL_REST_API_KEY) {
            console.warn("Skipping OneSignal: No REST API Key found");
            return res.status(200).json({ message: "Found products but missing API key", count });
        }

        const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify({
                app_id: "b652d9f4-6251-4741-af3d-f1cea47e50d8",
                contents: { "en": message, "ar": message },
                headings: { "en": "تنبيه انتهاء الصلاحية", "ar": "تنبيه انتهاء الصلاحية" },
                included_segments: ["Total Subscriptions"] // أقوى استهداف للجميع
            })
        });

        const result = await oneSignalResponse.json();

        // Check for specific OneSignal errors
        if (result.errors) {
            console.error("OneSignal API Error:", result.errors);
            return res.status(500).json({ error: "OneSignal Failed", details: result.errors });
        }


        res.status(200).json({
            success: true,
            productsFound: count,
            notificationSent: true,
            oneSignalId: result.id
        });

    } catch (error) {
        console.error('Check Expiry Cron Job Error:', error);
        res.status(500).json({ error: 'Failed to run cron job', details: error.message });
    }
}
