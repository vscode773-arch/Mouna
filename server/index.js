import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Health Check
app.get('/', (req, res) => {
    res.send('Mouna API is running 🚀');
});

// --- Auth Routes (Mocked for now, will connect to DB soon) ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // TODO: Replace with real DB check
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (user && user.password === password) { // Plain text for demo; use hashing in prod
            const { password, ...userWithoutPassword } = user;
            return res.json(userWithoutPassword);
        }
        res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
    try {
        const { barcode, page = 1, limit = 50, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};

        if (barcode) {
            where.barcode = barcode;
        } else if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Get total count for pagination info
        const total = await prisma.product.count({ where });

        let products = await prisma.product.findMany({
            where,
            skip: barcode ? 0 : skip, // No skip if searching by exact barcode
            take: barcode ? undefined : parseInt(limit),
            include: { addedBy: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // 🧠 MEMORY FEATURE: If searching by barcode and no product found in inventory
        if (barcode && products.length === 0) {
            // Check the SavedProduct memory table
            const savedDetails = await prisma.savedProduct.findUnique({
                where: { barcode }
            });

            if (savedDetails) {
                // Return the saved details formatted like a regular product
                // but with null id/expiry to indicate it needs to be "added" again
                products = [{
                    id: null, // Indicates new entry needed
                    barcode: savedDetails.barcode,
                    name: savedDetails.name,
                    category: savedDetails.category,
                    image: savedDetails.image,
                    expiry: null, // Must act as if we just fetched details from global DB
                    quantity: 0,
                    department: null,
                    fromMemory: true // Front-end can use this flag if needed
                }];
            }
        }

        res.json({
            data: products,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Fetch products error:", error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, category, expiry, department, image, addedByUserId, barcode, quantity = 1 } = req.body;

        // Logic: Check if product with same barcode AND same expiry exists
        // Note: expiry comes as string, need to normalize date for comparison
        const expiryDate = new Date(expiry);
        // Normalize to start of day to ensure loose comparison works if times differ
        expiryDate.setHours(0, 0, 0, 0);

        // 🧠 MEMORY FEATURE: Save metadata to SavedProduct table for future recall
        if (barcode && name) {
            await prisma.savedProduct.upsert({
                where: { barcode },
                update: {
                    name,
                    category,
                    image: image || undefined, // Only update image if provided
                    updatedAt: new Date()
                },
                create: {
                    barcode,
                    name,
                    category,
                    image,
                    updatedAt: new Date()
                }
            }).catch(err => console.error("Failed to save product to memory:", err));
        }

        // Find existing product with same barcode
        // Since we can't easily query by date equality in all generic DBs via Prisma findFirst without ranges, 
        // we'll find by barcode first then filter in JS if needed, or rely on precise match if available.
        let existingProduct = null;
        if (barcode) {
            const candidates = await prisma.product.findMany({
                where: { barcode }
            });

            existingProduct = candidates.find(p => {
                const pDate = new Date(p.expiry);
                pDate.setHours(0, 0, 0, 0);
                return pDate.getTime() === expiryDate.getTime();
            });
        }

        if (existingProduct) {
            // MERGE: Update quantity
            const updatedProduct = await prisma.product.update({
                where: { id: existingProduct.id },
                data: {
                    quantity: { increment: parseInt(quantity) },
                    // Optionally update other fields if they changed? 
                    // Let's assume user might want to update name/image too if they rescanned it.
                    name,
                    category,
                    image: image || existingProduct.image, // Keep old image if new is empty
                    department: department || existingProduct.department
                }
            });

            // Audit Log for Merge
            await prisma.auditLog.create({
                data: {
                    action: 'UPDATE',
                    target: updatedProduct.name,
                    details: `Increased quantity by ${quantity} (Merge)`,
                    userId: addedByUserId
                }
            });

            return res.json(updatedProduct);
        }

        // CREATE NEW
        const product = await prisma.product.create({
            data: {
                name,
                category,
                expiry: new Date(expiry),
                department, // Kept for backward compatibility but UI uses it less
                quantity: parseInt(quantity),
                image,
                addedByUserId,
                barcode
            }
        });

        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                target: product.name,
                details: `Added new product (Qty: ${quantity})`,
                userId: addedByUserId
            }
        });

        res.json(product);
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});


// --- Update Product Route ---
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, expiry, department, image, userId, quantity } = req.body;

        const updatedProduct = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                category,
                expiry: new Date(expiry),
                department,
                quantity: quantity ? parseInt(quantity) : undefined, // Update quantity if provided
                image
            }
        });

        // 🧠 MEMORY UPDATE: Also update memory if name/image changed
        if (updatedProduct.barcode) {
            await prisma.savedProduct.upsert({
                where: { barcode: updatedProduct.barcode },
                update: {
                    name,
                    category,
                    image: image || undefined,
                    updatedAt: new Date()
                },
                create: {
                    barcode: updatedProduct.barcode,
                    name: updatedProduct.name,
                    category: updatedProduct.category, // Fallback to current
                    image: image || updatedProduct.image,
                    updatedAt: new Date()
                }
            }).catch(e => console.error("Memory update failed", e));
        }

        // Create Audit Log
        if (userId) {
            await prisma.auditLog.create({
                data: {
                    action: 'UPDATE',
                    target: updatedProduct.name,
                    details: 'Updated product details',
                    userId: userId
                }
            });
        }

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// --- Delete Product Route ---
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, reason, reasonDetails } = req.body; // Expecting reason in body

        const productToDelete = await prisma.product.findUnique({ where: { id: parseInt(id) } });

        if (!productToDelete) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await prisma.product.delete({
            where: { id: parseInt(id) }
        });

        // Create Audit Log
        if (userId) {
            const auditDetails = reason === 'أخرى' && reasonDetails
                ? `حذف: ${reason} - ${reasonDetails}`
                : `حذف: ${reason}`;

            await prisma.auditLog.create({
                data: {
                    action: 'DELETE',
                    target: productToDelete.name,
                    details: auditDetails,
                    userId: userId
                }
            });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});


// --- User Update Route (Enhanced) ---
app.put('/api/users/:id', async (req, res) => {
    console.log(`[UPDATE USER] Request for ID: ${req.params.id}`, req.body);
    try {
        const { id } = req.params;
        // Accept all fields for admin updates, or just name for self-update
        const { name, username, password, role } = req.body;

        const dataToUpdate = { name };
        if (username) dataToUpdate.username = username;
        if (password && password.trim() !== '') dataToUpdate.password = password; // Should be hashed in prod
        if (role) dataToUpdate.role = role;

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: dataToUpdate
        });

        console.log(`[UPDATE USER] Success for ID: ${id}`);
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error("[UPDATE USER] Failed:", error);
        res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
});

// --- Dashboard Stats Route ---
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const totalProducts = await prisma.product.count();

        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const expiredCount = await prisma.product.count({
            where: {
                expiry: { lt: today }
            }
        });

        const expiringSoonCount = await prisma.product.count({
            where: {
                expiry: {
                    gte: today,
                    lte: sevenDaysFromNow
                }
            }
        });

        res.json({
            totalProducts,
            expiredCount,
            expiringSoonCount
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// --- Category Routes ---
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        const category = await prisma.category.create({
            data: { name }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// --- User Management Routes ---
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true, role: true, createdAt: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, name, role } = req.body;
        const user = await prisma.user.create({
            data: { username, password, name, role }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// --- Audit Log Routes ---
app.get('/api/audit-logs', async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            include: { user: { select: { name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// --- Expiry Check & Notification Route ---
app.get('/api/check-expiry', async (req, res) => {
    try {
        // Fix: Reset time to midnight to include products expiring today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        sevenDaysFromNow.setHours(23, 59, 59, 999); // Include the end of the 7th day

        // 1. Find Expiring Products
        const expiringProducts = await prisma.product.findMany({
            where: {
                expiry: {
                    gte: today,
                    lte: sevenDaysFromNow
                }
            },
            select: { name: true, expiry: true, category: true }
        });

        if (expiringProducts.length === 0) {
            return res.status(200).json({ message: 'No expiring products found.' });
        }

        // 2. Prepare Notification
        const count = expiringProducts.length;
        const message = `⚠️ تنبيه: لديكم ${count} منتجات ستنتهي صلاحيتها خلال 7 أيام! تفقد المخزون الآن.`;
        const heading = "🔔 تنبيه انتهاء الصلاحية";

        // 3. Send to OneSignal
        if (!process.env.ONESIGNAL_REST_API_KEY) {
            console.warn("⚠️ Skipping OneSignal: No REST API Key found in environment");
            return res.status(200).json({
                message: "Found products but missing API key",
                count,
                products: expiringProducts.map(p => ({ name: p.name, expiry: p.expiry }))
            });
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
                headings: { "en": heading, "ar": heading },
                included_segments: ["Total Subscriptions"], // Send to everyone subscribed
                data: { type: "expiry_alert", count }
            })
        });

        const result = await oneSignalResponse.json();

        // Check for specific OneSignal errors
        if (result.errors) {
            console.error("❌ OneSignal API Error:", result.errors);
            return res.status(500).json({ error: "OneSignal Failed", details: result.errors });
        }

        console.log(`✅ Notification sent successfully! ID: ${result.id}`);

        res.status(200).json({
            success: true,
            productsFound: count,
            notificationSent: true,
            oneSignalId: result.id,
            products: expiringProducts.map(p => ({ name: p.name, category: p.category, expiry: p.expiry }))
        });

    } catch (error) {
        console.error('❌ Check Expiry Error:', error);
        res.status(500).json({ error: 'Failed to check expiry', details: error.message });
    }
});

// --- Backup & Restore Routes ---
app.get('/api/backup', async (req, res) => {
    try {
        const [users, products, categories, auditLogs] = await Promise.all([
            prisma.user.findMany(),
            prisma.product.findMany(),
            prisma.category.findMany(),
            prisma.auditLog.findMany()
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
                users,
                products,
                categories,
                auditLogs
            }
        };

        res.json(backupData);
    } catch (error) {
        console.error("Backup failed:", error);
        res.status(500).json({ error: 'Failed to generate backup' });
    }
});

app.post('/api/restore', async (req, res) => {
    const { data } = req.body;

    if (!data || !data.users || !data.products) {
        return res.status(400).json({ error: 'Invalid backup file format' });
    }

    console.log("[RESTORE] Starting restore process...");

    try {
        // Use a transaction to ensure integrity
        await prisma.$transaction(async (tx) => {
            // 1. Clear existing data (Order matters due to foreign keys)
            await tx.auditLog.deleteMany();
            await tx.product.deleteMany();
            await tx.category.deleteMany();
            await tx.user.deleteMany();
            // Note: We deliberately do NOT clear SavedProduct memory table during restore
            // to preserve the learned product history.

            // 2. Restore Users
            for (const user of data.users) {
                await tx.user.create({ data: user });
            }

            // 3. Restore Categories
            for (const cat of data.categories) {
                await tx.category.create({ data: cat });
            }

            // 4. Restore Products
            for (const prod of data.products) {
                await tx.product.create({
                    data: {
                        ...prod,
                        expiry: new Date(prod.expiry),
                        createdAt: new Date(prod.createdAt),
                        updatedAt: new Date(prod.updatedAt)
                    }
                });
            }

            // 5. Restore Audit Logs
            for (const log of data.auditLogs) {
                await tx.auditLog.create({
                    data: {
                        ...log,
                        createdAt: new Date(log.createdAt)
                    }
                });
            }
        });

        console.log("[RESTORE] Completed successfully");
        res.json({ message: 'Restore successful' });
    } catch (error) {
        console.error("Restore failed:", error);
        res.status(500).json({ error: 'Restore failed: ' + error.message });
    }
});

// Start Server (Only if not in Vercel environment or if called directly)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
