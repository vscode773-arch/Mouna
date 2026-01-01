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
        const products = await prisma.product.findMany({
            include: { addedBy: { select: { name: true } } }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, category, expiry, department, image, addedByUserId } = req.body;
        const product = await prisma.product.create({
            data: {
                name,
                category,
                expiry: new Date(expiry),
                department,
                image,
                addedByUserId
            }
        });

        // Create Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                target: product.name,
                details: 'Added new product',
                userId: addedByUserId
            }
        });

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});


// --- Update Product Route ---
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, expiry, department, image, userId } = req.body;

        const updatedProduct = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                category,
                expiry: new Date(expiry),
                department,
                image
            }
        });

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

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
